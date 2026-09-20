# Ledger

An address book with a **React** frontend, a **Ruby on Rails** JSON API, and **PostgreSQL**.

```
frontend (Vite, :5173)  →  /api/v1/*  →  backend (Rails, :3000)  →  PostgreSQL
```

## Requirements

- Ruby 3.3 and Rails 8
- Node.js 22
- PostgreSQL 16

This repo includes a `.tool-versions` file for asdf (`nodejs 22.14.0`, `ruby 3.3.6`).

## Setup

Start PostgreSQL, then create the database:

```bash
brew services start postgresql@16

cd backend
bundle install
bin/rails db:create db:migrate
```

Install the frontend:

```bash
cd frontend
npm install
```

## Run

In two terminals:

```bash
cd backend && bin/rails server
```

```bash
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to Rails on port 3000.

## API

| Method | Path | Body |
| --- | --- | --- |
| `GET` | `/api/v1/addresses` | |
| `POST` | `/api/v1/addresses` | `{ "address": { "address": "25 Pitt St, Hurstville NSW", "lat": -33.949285, "long": 151.098093 } }` |
| `PATCH` | `/api/v1/addresses/:id` | `{ "address": { "address": "...", "lat": -33.9, "long": 151.1 } }` |
| `DELETE` | `/api/v1/addresses/:id` | |
| `GET` | `/api/v1/deliveries` | optional `?status=created` |
| `POST` | `/api/v1/deliveries` | `{ "delivery": { "reference": "TV-300001", "customer_name": "Coastal Electronics", "address": "25 Pitt St, Hurstville NSW", "time_window_start": "08:00", "time_window_end": "10:00" } }` |
| `PATCH` | `/api/v1/deliveries/:reference` | `{ "delivery": { "status": "picked_up" } }` |
| `GET` | `/api/v1/deliveries/:reference/histories` | |
| `POST` | `/api/v1/deliveries/import` | multipart `file` (CSV) |

Address `address` is required and unique. `lat` must be between -90 and 90. `long` must be between -180 and 180.

New deliveries always start as `created`. The address must already exist in `addresses`. Status can only move `created → picked_up → in_transit → delivered`. Any status except `delivered` can move to `failed`. `GET /api/v1/deliveries?status=` filters by one of those statuses. `GET /api/v1/deliveries/:reference/histories` returns that delivery’s status changes newest first (`id`, `status`, `created_at`); they are not embedded on the list endpoint.

CSV import maps `pending` → `created`, `completed` → `delivered`, and `failed` → `failed`. Duplicate references are skipped and listed in `errors`. Existing addresses are reused by address string; missing addresses are created.

## Tests

```bash
cd backend && bin/rails test
```


## Key decisions

1. **Data schema.** Address, lat, and lng live in a separate `addresses` table, not on `deliveries`. An address string maps 1:1 to coordinates, so each street is stored once (`addresses.address` is unique) instead of repeating lat/lng on every delivery.

   `deliveries.address_id` → `addresses.id` (`ON DELETE RESTRICT`). Status history is append-only: one row per change, `delivery_reference` → `deliveries.reference` (`ON DELETE CASCADE`).

   PostgreSQL enum `delivery_status`: `created`, `picked_up`, `in_transit`, `delivered`, `failed`.

   **`addresses`**

   | Column | Type | Notes |
   | --- | --- | --- |
   | `id` | bigint | PK, serial |
   | `address` | string | NOT NULL, unique |
   | `lat` | decimal(10,6) | required in the model, -90–90 |
   | `long` | decimal(10,6) | required in the model, -180–180 |
   | `created_at` / `updated_at` | datetime | |

   **`deliveries`**

   | Column | Type | Notes |
   | --- | --- | --- |
   | `reference` | string | PK (for example `TV-300001`) |
   | `address_id` | bigint | NOT NULL, FK to `addresses.id` |
   | `customer_name` | string | NOT NULL |
   | `status` | enum | NOT NULL, default `created` |
   | `time_window_start` / `time_window_end` | time | optional |
   | `created_at` / `updated_at` | datetime | |

   Indexes: `address_id`, `status`.

   **`delivery_histories`**

   | Column | Type | Notes |
   | --- | --- | --- |
   | `id` | bigint | PK, serial |
   | `delivery_reference` | string | NOT NULL, FK to `deliveries.reference` |
   | `status` | enum | NOT NULL |
   | `created_at` | datetime | no `updated_at` |

   Index: `(delivery_reference, created_at)`.

2. Address management.
   There are some possible solutions for managing address and lat lngs. One way is to use geocoder. However, I checked several data points in deliveries.csv and it does not match the google map result. So I used another way: let users to create available address in database and users can update existing addresses and delete unused addresses. 

3. Deliveries status management 
   3.1 manual create in UI
      Users can create delivery in frontend. New deliveries can be created from frontend. And created deliveries all starts from status created. When create delivery from UI, the user can only use address exists in address table. (Means we support delivery to these addresses). And in web page the user can also update status, but the status it can update is restricted by the workflow created → picked_up → in_transit → delivered, with non delivered delivery can be changed to failed.

   3.2 import deliveries from csv. 
      For demo and batch creation, I add a button to import deliveries from csv file. And the backend  will parse the csv file and create  the delivery. In document the status is named created → picked_up → in_transit → delivered,, however, the csv file contains status pending, failed, and completed. So based on my understanding, I map pending to created, completed to delievered. And when one line of record violates reference unique restriction, I skip that row,  and include in error message that this row is skipped because of reference duplicate and keep processing remaining records. And  
      

4. Features introduced for user experience.
   I decide to introduce several features to improve the user experience
   4.1 
      filter on deliveries.I enabled seach deliveres on reference, customer name and status.  Becaseu when delivery data grows, it is hard for user to find the delivery and update the status. So I let the user to search the delivery given the reference. 
   4.2 paganation
      I let the page to show at most 20 deliveries once at a time, so that it will not show too much for user to review and it will take too much time to load the data when there are a large amount of deliveries.
   4.3 sorting based on fields. In the UI, the user can sort the deliveries based on fields. This will make user to see a more orgnized deliveries and quickly find the delivery it needs.

6. Concurrency issue.
   Different users (or two browser tabs) can PATCH the same delivery status at the same time. Puma is multi-threaded, so two requests can both read the old status, both pass the transition check, and the last write wins. Example: both see `in_transit`; one updates to `delivered` and the other to `failed`. Without a lock, the package can end up `failed` after it was already delivered, and `delivery_histories` records both changes as if they were a valid path.

   Status transition is an application rule (`created → picked_up → in_transit → delivered`, and any non-`delivered` status can move to `failed`). A plain `UPDATE ... WHERE reference = ?` does not check that the current status is still the one we validated against.

   So `PATCH /api/v1/deliveries/:reference` loads the row with `SELECT ... FOR UPDATE` inside a transaction (`Delivery.lock.find`), then validates the transition from `status_in_database`. The second request waits for the first transaction to commit, then sees the new status. If the move is no longer allowed, it returns 422 and the first write stays.

   I chose pessimistic locking over optimistic locking for this path. The race is two writers on the **same delivery**, not high QPS spread across many rows. Optimistic locking is better when conflicts are rare and retries are cheap; here a conflict means the status machine has already moved, so the second request should fail, not retry `in_transit → failed` after the row is `delivered`. The transaction is short (lock, validate, update status, insert history), so waiting on the row lock is cheap. Status and history stay in one transaction, so they cannot diverge. Optimistic locking (`UPDATE ... WHERE status = old_status` or a `lock_version` column) would also prevent lost updates; I did not use it because this app does not have a hot-row throughput problem, and I do not want clients retrying a transition that is no longer legal. Reads (list, filter, pagination) and CSV import (create or skip) do not take this lock.

   The UI can still be stale: the dropdown is built from the list the user already loaded. A rejected update is a UX issue, not corrupted data; refresh shows the latest status. 

7. UI design:
   Use bootstrap to make the UI look prettier. It offers prettier button for add, save, import, previous and next. Offer alert and Toast for import success and failure and a colored badge for different status.


### What I will do next:
1. Enable delete and batch delete of delivery if needed. 

2. Optimize the UI and UX of viewing history. There is still a problem that the view history button is pretty behind that it falls behind. And after you open the history, you need to roll forward to see the exact history.

3. Enable updating and deleting existing deliveries. My current web page are built based on the assumption that once it is created, the fields like customers , address and windown will not be modified or the delivery will be deleted. However, it is possible that the user needs to modify these fields and delete some deliveries. In these case, I will consider using soft delete by introducing updated_at and deleted_at fields.

### out of scope yet but worth discussing:

1. Real time update. My current web app does not support real time update. Which means if the status is updated from other source(like other user or other API call), the web app will not show the update immediately. 

2. Geocoding. As discussed before, the address in deliveres does not quite match the lat lng in real world. But in production, it may be better UX if the user just need to put address and it maps to lat lng immediately.

3. Address auto complete.  Currently in the create delivery form the address string needs to be exact match with an existing address in db. However, A better user experience is to use auto compelte to find a matching address.



### AI usage:

AI tool: Use cursor with Cursor Grok 4.6

The way I use AI: I first break the whole project into multiple small pieces. First I asked to build the address management page, I wrote the restrictions in prompt including the address should be unique and we should be able to update and delete addresses. I first asked the AI to work in plan mode and in each plan mode I asked to generate the to do list in data migration , backend front-end, and test order. I review the plan and confirm it. 

Then I move to the second part, I suggest using address as the foreign key, however that raise a question that what affect will it make to delete a address if address.id is a foreign key of delivery. AI offered 3 solutions, restrict, cascade ad set null. I consider that an address may be shared by multiple deliveries and delete it may make a delivery invalid. So I take the restrict way and  write my delivery data schema in prompt and suggest the use case that an address that is used by a delivery should not be deleted.  And in prompt I also added the restriction of status transition flow that certain status can only be changed to certain status. As well, the AI generate the plan and after reviewing the plan, it generate the data migration, backend and frontend for me. When review, I checked specifically that the test case covers address deletion handling and status transition.

In the last for status history part, I wrote the behaviors and edge cases and data schema of status history including the history created when import from csv and create delivery and the place to put the status history and AI generate the API code and frontend code. 

The thing that AI go wrong and how I caught it: 
1. When first generating the add delivery feature, it generated with a field status, and you can select status like in transit and delivered when create a delivery. That is not my requirement so I let the AI to remove the status input box and use created as the default creation status.

2. The first version of update status API does not consider concurrent issue. As discussed, concurrency issue may lead to illegal status update and invalid status history. The AI offered several solutions and I choose pessimistic lock because two requests collide on the same delivery, the transaction is short, and a 422 is the right outcome when the status has already moved. Optimistic locking would also stop lost updates, but retrying is a poor fit for a one-way status machine, and this app is not a high-QPS hot-row system where lock wait would matter.
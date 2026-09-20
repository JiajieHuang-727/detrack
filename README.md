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
| `GET` | `/api/v1/deliveries` | |
| `POST` | `/api/v1/deliveries` | `{ "delivery": { "reference": "TV-300001", "customer_name": "Coastal Electronics", "address": "25 Pitt St, Hurstville NSW", "time_window_start": "08:00", "time_window_end": "10:00" } }` |

Address `address` is required and unique. `lat` must be between -90 and 90. `long` must be between -180 and 180.

New deliveries always start as `created`. Status values are `created`, `picked_up`, `in_transit`, `delivered`, `failed`.

## Tests

```bash
cd backend && bin/rails test
```

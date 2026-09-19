# Ledger

A todo list with a **React** frontend, a **Ruby on Rails** JSON API, and **PostgreSQL**.

```
frontend (Vite, :5173)  →  /api/v1/*  →  backend (Rails, :3000)  →  PostgreSQL
```

## Requirements

- Ruby 3.3 and Rails 8
- Node.js 22
- PostgreSQL 16

This repo includes a `.tool-versions` file for asdf (`nodejs 22.14.0`, `ruby 3.3.6`).

## Setup

Start PostgreSQL, then create the database and seed a few tasks:

```bash
brew services start postgresql@16

cd backend
bundle install
bin/rails db:create db:migrate db:seed
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
| `GET` | `/api/v1/todos` | |
| `POST` | `/api/v1/todos` | `{ "todo": { "title": "Buy milk" } }` |
| `GET` | `/api/v1/todos/:id` | |
| `PATCH` | `/api/v1/todos/:id` | `{ "todo": { "title": "...", "completed": true } }` |
| `DELETE` | `/api/v1/todos/:id` | |

Titles are required and limited to 255 characters.

## Tests

```bash
cd backend && bin/rails test
```

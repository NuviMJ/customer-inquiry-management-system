# Customer Inquiry Management System

A small full-stack app for a service business to record customer inquiries, find them later, and move them through their lifecycle (New → In Progress → Resolved).

Built for the Coffee Ninja fullstack technical assessment. Design notes are in [DECISIONS.md](DECISIONS.md).

## Stack

- **Frontend:** React 18 + TypeScript (Vite), plain CSS, in `client/`
- **Backend:** Node.js 18 + Express + TypeScript, in `server/`
- **Database:** PostgreSQL (schema and seed in `server/db/`)
- **Auth:** email + password, JWT in an httpOnly cookie, enforced on every API route

## Project structure

```
client/           React frontend
  src/pages/      Login, Dashboard, Inquiries, New inquiry, Inquiry detail, Staff, Managers
  src/components/ Layout, table, badges
server/           Express API
  db/             schema.sql, seed.ts, setup.ts
  src/routes/     auth, inquiries, users
  src/services/   inquiry rules (access, status, claim, duplicates)
  tests/          backend tests
```

## Prerequisites

- Node.js 18 or newer
- PostgreSQL 14 or newer, running locally

## Setup

1. **Create the database** (in pgAdmin or psql):

   ```sql
   CREATE DATABASE coffee_ninja_db;
   ```

2. **Configure the API.** Copy `server/.env.example` to `server/.env` and set your Postgres password:

   ```
   PORT=4000
   DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/coffee_ninja_db
   JWT_SECRET=change-me-to-a-long-random-string
   ```

3. **Install dependencies** (root, server and client):

   ```
   npm run install:all
   ```

4. **Create tables and seed data.** This drops and recreates the tables, so it also resets the data:

   ```
   npm run db:setup --prefix server
   ```

## Run

Start the API and the frontend together:

```
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000 (the frontend proxies `/api` to it, so no CORS setup is needed)

To run them separately: `npm run dev --prefix server` and `npm run dev --prefix client`.

## Test accounts

All seeded accounts use the password `password123`.

| Email                      | Role    | Sees                                   |
| -------------------------- | ------- | -------------------------------------- |
| manager@coffeeninja.test   | Manager | All inquiries, can assign and add staff |
| amal@coffeeninja.test      | Staff   | Own inquiries + unassigned ones         |
| nimali@coffeeninja.test    | Staff   | Own inquiries + unassigned ones         |

Managers can add more staff from the Staff page. New staff accounts also start with `password123`.

## Tests

```
npm test
```

Runs both suites. They can also be run separately:

- **Backend** (`server/tests/`, needs the seeded database and `.env`):
  - `status.test.ts`: the status transition rules (allowed moves, rejected moves)
  - `access.test.ts`: 401 without a session, 403 for staff opening someone else's inquiry, 200 for a manager, 409 when reassigning an in-progress inquiry, and only the first of two staff can claim an unassigned inquiry
- **Frontend** (`client/src/pages/NewInquiryPage.test.tsx`):
  - an empty form shows field errors and sends no request
  - a 409 duplicate response shows the message with a link to the existing inquiry

Testing gaps and reasoning are described in DECISIONS.md.

## API summary

All responses use the same error shape: `{ "error": { "code", "message", "details?" } }` with 400, 401, 403, 404 or 409.

| Method | Route                          | Who       | Purpose                                   |
| ------ | ------------------------------ | --------- | ----------------------------------------- |
| POST   | /api/auth/login                | anyone    | Sign in, sets cookie                      |
| POST   | /api/auth/logout               | signed in | Clear cookie                              |
| GET    | /api/auth/me                   | signed in | Current user                              |
| GET    | /api/inquiries?status=&q=      | signed in | List (staff see own + unassigned)         |
| POST   | /api/inquiries                 | signed in | Create (409 on open duplicate)            |
| GET    | /api/inquiries/:id             | signed in | One inquiry (403 if not allowed)          |
| PATCH  | /api/inquiries/:id/status      | assignee or manager | Change status with `expectedStatus` (409 if stale) |
| POST   | /api/inquiries/:id/claim       | signed in | Take an unassigned inquiry (409 if taken) |
| PATCH  | /api/inquiries/:id             | assignee or manager | Priority; assignee (managers only)        |
| GET    | /api/users                     | manager   | Users with assigned counts                |
| POST   | /api/users                     | manager   | Add a staff member                        |

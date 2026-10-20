# Customer Inquiry Management System

A small full-stack app for a service business to record customer inquiries, find them later, and move them through their lifecycle (New → In Progress → Resolved).

Built for the Coffee Ninja fullstack technical assessment.

## Stack

- **Frontend:** React + TypeScript (Vite) in `client/`
- **Backend:** Node.js + Express + TypeScript in `server/`
- **Database:** PostgreSQL

## Project structure

```
client/   React frontend
server/   Express API
  db/     schema and seed data
  src/    API source
  tests/  backend tests
```

## Local setup

_Will be completed as the project is built._

1. Create a PostgreSQL database named `inquiry_db`.
2. Copy `server/.env.example` to `server/.env` and fill in your database password.
3. Install dependencies: `npm run install:all`
4. Run both servers: `npm run dev`

Frontend: http://localhost:5173 · API: http://localhost:4000

## Test accounts

_Will be added with the seed script._

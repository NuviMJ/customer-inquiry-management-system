-- Reset. Running db:setup always starts from a clean database.
DROP TABLE IF EXISTS inquiries;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('staff', 'manager')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inquiries (
  id            SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  contact       TEXT NOT NULL,
  subject       TEXT NOT NULL,
  description   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'New'
                CHECK (status IN ('New', 'In Progress', 'Resolved')),
  priority      TEXT CHECK (priority IN ('High', 'Medium', 'Low')),
  created_by    INTEGER NOT NULL REFERENCES users(id),
  assigned_to   INTEGER REFERENCES users(id), -- NULL = unassigned, anyone can claim
  updated_by    INTEGER NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff lists are filtered by assignee; the overview filters by status.
CREATE INDEX inquiries_assigned_to_idx ON inquiries (assigned_to);
CREATE INDEX inquiries_status_idx ON inquiries (status);

-- Duplicate rule: one open inquiry per contact + subject (case-insensitive).
CREATE UNIQUE INDEX inquiries_open_duplicate_idx
  ON inquiries (lower(contact), lower(subject))
  WHERE status <> 'Resolved';

import bcrypt from 'bcryptjs'
import type { Pool } from 'pg'

export const SEED_PASSWORD = 'password123'

const users = [
  { name: 'Maya Perera', email: 'manager@coffeeninja.test', role: 'manager' },
  { name: 'Amal Silva', email: 'amal@coffeeninja.test', role: 'staff' },
  { name: 'Nimali Fernando', email: 'nimali@coffeeninja.test', role: 'staff' },
]

// [customer, contact, subject, description, status, priority, assignee email]
const inquiries = [
  ['Ruwan Jayasuriya', 'ruwan@example.com', 'Espresso machine not heating', 'Machine bought last month stops heating after 10 minutes.', 'New', 'High', 'amal@coffeeninja.test'],
  ['Dilani Wickrama', '+94 77 123 4567', 'Bulk order for office', 'Needs a quote for 20 kg of beans monthly.', 'In Progress', 'Medium', 'amal@coffeeninja.test'],
  ['Kasun Bandara', 'kasun.b@example.com', 'Grinder replacement part', 'Asks whether burr sets for model G2 are in stock.', 'Resolved', 'Low', 'amal@coffeeninja.test'],
  ['Sanduni Rajapaksa', 'sanduni@example.com', 'Barista training session', 'Wants to book a training session for 4 new staff.', 'New', null, 'nimali@coffeeninja.test'],
  ['Tharindu Peiris', '+94 71 987 6543', 'Late delivery complaint', 'Order #4521 arrived two days late, asks for compensation.', 'In Progress', 'High', 'nimali@coffeeninja.test'],
  ['Ishara Gunasekara', 'ishara.g@example.com', 'Invoice copy request', 'Needs a copy of the September invoice for accounts.', 'Resolved', null, 'nimali@coffeeninja.test'],
] as const

export async function seed(pool: Pool) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  const idByEmail = new Map<string, number>()

  for (const u of users) {
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [u.name, u.email, passwordHash, u.role],
    )
    idByEmail.set(u.email, rows[0].id)
  }

  for (const [customer, contact, subject, description, status, priority, assignee] of inquiries) {
    const userId = idByEmail.get(assignee)
    await pool.query(
      `INSERT INTO inquiries
         (customer_name, contact, subject, description, status, priority, created_by, assigned_to, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)`,
      [customer, contact, subject, description, status, priority, userId],
    )
  }

  return { users: users.length, inquiries: inquiries.length }
}

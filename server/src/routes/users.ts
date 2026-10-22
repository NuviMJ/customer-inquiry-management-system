import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { pool } from '../db.js'
import { AppError } from '../errors.js'
import { requireAuth, requireManager } from '../middleware/auth.js'

export const usersRouter = Router()

// Managers use this for the reassign dropdown and the Staff / Managers pages.
// Counts are inquiries currently assigned to each user, split by status.
usersRouter.get('/', requireAuth, requireManager, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at AS "createdAt",
              COUNT(i.id) FILTER (WHERE i.status = 'New')::int         AS "newCount",
              COUNT(i.id) FILTER (WHERE i.status = 'In Progress')::int AS "inProgressCount",
              COUNT(i.id) FILTER (WHERE i.status = 'Resolved')::int    AS "resolvedCount"
       FROM users u
       LEFT JOIN inquiries i ON i.assigned_to = u.id
       GROUP BY u.id
       ORDER BY u.name`,
    )
    res.json({ users: rows })
  } catch (err) {
    next(err)
  }
})

const createStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name needs at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(100),
})

// New staff start with this password; changing it is listed under future improvements
export const DEFAULT_STAFF_PASSWORD = 'password123'

// Managers add staff accounts. Role is always staff; managers are not created from the app.
usersRouter.post('/', requireAuth, requireManager, async (req, res, next) => {
  try {
    const input = createStaffSchema.parse(req.body)
    const passwordHash = await bcrypt.hash(DEFAULT_STAFF_PASSWORD, 10)

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'staff')
       RETURNING id, name, email, role, created_at AS "createdAt",
                 0 AS "newCount", 0 AS "inProgressCount", 0 AS "resolvedCount"`,
      [input.name, input.email, passwordHash],
    )
    res.status(201).json({ user: rows[0] })
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      next(new AppError('CONFLICT', 'A user with this email already exists', { fields: { email: 'Email already in use' } }))
      return
    }
    next(err)
  }
})

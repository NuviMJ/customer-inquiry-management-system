import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireManager } from '../middleware/auth.js'
import type { User } from '../types.js'

export const usersRouter = Router()

// Managers need the staff list to reassign inquiries.
usersRouter.get('/', requireAuth, requireManager, async (_req, res, next) => {
  try {
    const { rows } = await pool.query<User>('SELECT id, name, email, role FROM users ORDER BY name')
    res.json({ users: rows })
  } catch (err) {
    next(err)
  }
})

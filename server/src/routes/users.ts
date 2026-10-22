import { Router } from 'express'
import { pool } from '../db.js'
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

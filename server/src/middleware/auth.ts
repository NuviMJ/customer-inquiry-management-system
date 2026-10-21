import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { pool } from '../db.js'
import { AppError } from '../errors.js'
import type { User } from '../types.js'

export const COOKIE_NAME = 'token'

export function signToken(userId: number) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '8h' })
}

// Verifies the cookie and loads the user fresh from the DB, so role changes or
// deleted accounts take effect immediately instead of living on in the token.
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) throw new AppError('UNAUTHENTICATED', 'Please sign in')

    let userId: number
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { sub: string }
      userId = Number(payload.sub)
    } catch {
      throw new AppError('UNAUTHENTICATED', 'Your session is invalid or expired, please sign in again')
    }

    const { rows } = await pool.query<User>(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId],
    )
    if (!rows[0]) throw new AppError('UNAUTHENTICATED', 'Account no longer exists')

    req.user = rows[0]
    next()
  } catch (err) {
    next(err)
  }
}

export const requireManager: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'manager') {
    next(new AppError('FORBIDDEN', 'Only managers can do this'))
    return
  }
  next()
}

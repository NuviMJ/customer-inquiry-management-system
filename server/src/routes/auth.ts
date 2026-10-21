import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { pool } from '../db.js'
import { AppError } from '../errors.js'
import { COOKIE_NAME, requireAuth, signToken } from '../middleware/auth.js'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const { rows } = await pool.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE lower(email) = lower($1)',
      [email],
    )
    const user = rows[0]
    // Same message for unknown email and wrong password, so emails cannot be guessed.
    const ok = user && (await bcrypt.compare(password, user.password_hash))
    if (!ok) throw new AppError('UNAUTHENTICATED', 'Incorrect email or password')

    res.cookie(COOKIE_NAME, signToken(user.id), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    })
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME)
  res.status(204).end()
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

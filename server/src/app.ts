import express from 'express'
import cookieParser from 'cookie-parser'
import { authRouter } from './routes/auth.js'
import { errorHandler, notFoundHandler } from './errors.js'
import './types.js'

// The app is separate from the listener so tests can import it without opening a port
export const app = express()

app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)

app.use(notFoundHandler)
app.use(errorHandler)

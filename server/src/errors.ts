import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL'

const statusByCode: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
}

// Every error the API returns is one of these, so clients get one predictable shape.
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message)
  }
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {}
    for (const issue of err.issues) fields[issue.path.join('.')] = issue.message
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields', details: { fields } },
    })
    return
  }

  if (err instanceof AppError) {
    res.status(statusByCode[err.code]).json({
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
    })
    return
  }

  console.error(err)
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } })
}

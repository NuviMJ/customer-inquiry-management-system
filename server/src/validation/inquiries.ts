import { z } from 'zod'

export const STATUSES = ['New', 'In Progress', 'Resolved'] as const
export const PRIORITIES = ['High', 'Low'] as const

const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneLike = /^\+?[\d][\d\s-]{6,}$/

export const idParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: 'Inquiry id must be a number' }).int().positive(),
})

export const createInquirySchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name needs at least 2 characters').max(100),
  contact: z
    .string()
    .trim()
    .min(1, 'Contact is required')
    .max(100)
    .refine((v) => emailLike.test(v) || phoneLike.test(v), 'Enter an email address or phone number'),
  subject: z.string().trim().min(3, 'Subject needs at least 3 characters').max(120),
  description: z.string().trim().min(10, 'Description needs at least 10 characters').max(2000),
  priority: z.enum(PRIORITIES, { message: 'Priority must be High or Low' }).nullish(),
  assignedTo: z.number().int().positive().optional(),
})

export const listQuerySchema = z.object({
  status: z.enum(STATUSES, { message: 'Status must be New, In Progress or Resolved' }).optional(),
  q: z.string().trim().max(100).optional(),
})

export type CreateInquiryInput = z.infer<typeof createInquirySchema>
export type ListQuery = z.infer<typeof listQuerySchema>

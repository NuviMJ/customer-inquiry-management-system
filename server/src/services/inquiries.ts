import { pool } from '../db.js'
import { AppError } from '../errors.js'
import type { User } from '../types.js'
import { canTransition } from '../status.js'
import type { ChangeStatusInput, CreateInquiryInput, ListQuery, UpdateInquiryInput } from '../validation/inquiries.js'

export interface Inquiry {
  id: number
  customerName: string
  contact: string
  subject: string
  description: string
  status: 'New' | 'In Progress' | 'Resolved'
  priority: 'High' | 'Low' | null
  createdAt: string
  updatedAt: string
  createdBy: { id: number; name: string }
  assignedTo: { id: number; name: string }
  updatedBy: { id: number; name: string }
}

// One SELECT shape for every read, so the client always gets the same object.
const SELECT = `
  SELECT i.id, i.customer_name AS "customerName", i.contact, i.subject, i.description,
         i.status, i.priority, i.created_at AS "createdAt", i.updated_at AS "updatedAt",
         json_build_object('id', c.id, 'name', c.name) AS "createdBy",
         json_build_object('id', a.id, 'name', a.name) AS "assignedTo",
         json_build_object('id', u.id, 'name', u.name) AS "updatedBy"
  FROM inquiries i
  JOIN users c ON c.id = i.created_by
  JOIN users a ON a.id = i.assigned_to
  JOIN users u ON u.id = i.updated_by
`

// Access rule: staff see only inquiries assigned to them, managers see all.
export function canAccess(user: User, inquiry: Inquiry) {
  return user.role === 'manager' || inquiry.assignedTo.id === user.id
}

export async function listInquiries(user: User, query: ListQuery): Promise<Inquiry[]> {
  const where: string[] = []
  const params: unknown[] = []

  if (user.role !== 'manager') {
    params.push(user.id)
    where.push(`i.assigned_to = $${params.length}`)
  }
  if (query.status) {
    params.push(query.status)
    where.push(`i.status = $${params.length}`)
  }
  if (query.q) {
    params.push(`%${query.q}%`)
    where.push(`(i.customer_name ILIKE $${params.length} OR i.subject ILIKE $${params.length} OR i.contact ILIKE $${params.length})`)
  }

  const sql = `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY i.created_at DESC`
  const { rows } = await pool.query<Inquiry>(sql, params)
  return rows
}

export async function getInquiry(user: User, id: number): Promise<Inquiry> {
  const { rows } = await pool.query<Inquiry>(`${SELECT} WHERE i.id = $1`, [id])
  const inquiry = rows[0]
  if (!inquiry) throw new AppError('NOT_FOUND', `Inquiry #${id} does not exist`)
  if (!canAccess(user, inquiry)) throw new AppError('FORBIDDEN', 'This inquiry is assigned to someone else')
  return inquiry
}

async function findOpenDuplicate(contact: string, subject: string) {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM inquiries
     WHERE lower(contact) = lower($1) AND lower(subject) = lower($2) AND status <> 'Resolved'`,
    [contact, subject],
  )
  return rows[0]?.id
}

export async function createInquiry(user: User, input: CreateInquiryInput): Promise<Inquiry> {
  const assignedTo = input.assignedTo ?? user.id
  if (assignedTo !== user.id && user.role !== 'manager') {
    throw new AppError('FORBIDDEN', 'Only managers can assign inquiries to other staff')
  }

  const existingId = await findOpenDuplicate(input.contact, input.subject)
  if (existingId) {
    throw new AppError('CONFLICT', 'An open inquiry with the same contact and subject already exists', {
      existingId,
    })
  }

  try {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO inquiries
         (customer_name, contact, subject, description, priority, created_by, assigned_to, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $6)
       RETURNING id`,
      [input.customerName, input.contact, input.subject, input.description, input.priority ?? null, user.id, assignedTo],
    )
    return getInquiry(user, rows[0].id)
  } catch (err) {
    const code = (err as { code?: string }).code
    // 23505 = unique index hit (duplicate created in between), 23503 = unknown assignee
    if (code === '23505') throw new AppError('CONFLICT', 'An open inquiry with the same contact and subject already exists')
    if (code === '23503') throw new AppError('VALIDATION_ERROR', 'Assigned staff member does not exist', { fields: { assignedTo: 'Unknown staff member' } })
    throw err
  }
}

export async function changeStatus(user: User, id: number, input: ChangeStatusInput): Promise<Inquiry> {
  await getInquiry(user, id) // 404 / 403 checks

  if (!canTransition(input.expectedStatus, input.status)) {
    throw new AppError('CONFLICT', `Cannot move an inquiry from ${input.expectedStatus} to ${input.status}`, {
      reason: 'INVALID_TRANSITION',
    })
  }

  // Only updates if the status is still what the client saw; 0 rows means another tab changed it.
  const { rowCount } = await pool.query(
    `UPDATE inquiries SET status = $1, updated_by = $2, updated_at = now()
     WHERE id = $3 AND status = $4`,
    [input.status, user.id, id, input.expectedStatus],
  )
  if (rowCount === 0) {
    const current = await getInquiry(user, id)
    throw new AppError('CONFLICT', `This inquiry was changed by someone else and is now ${current.status}`, {
      reason: 'STALE',
      currentStatus: current.status,
    })
  }

  return getInquiry(user, id)
}

export async function updateInquiry(user: User, id: number, input: UpdateInquiryInput): Promise<Inquiry> {
  await getInquiry(user, id)

  if (input.assignedTo !== undefined && user.role !== 'manager') {
    throw new AppError('FORBIDDEN', 'Only managers can reassign inquiries')
  }

  try {
    await pool.query(
      `UPDATE inquiries
       SET priority = COALESCE($1, priority),
           assigned_to = COALESCE($2, assigned_to),
           updated_by = $3, updated_at = now()
       WHERE id = $4`,
      [input.priority === undefined ? null : input.priority, input.assignedTo ?? null, user.id, id],
    )
  } catch (err) {
    if ((err as { code?: string }).code === '23503') {
      throw new AppError('VALIDATION_ERROR', 'Assigned staff member does not exist', { fields: { assignedTo: 'Unknown staff member' } })
    }
    throw err
  }

  return getInquiry(user, id)
}

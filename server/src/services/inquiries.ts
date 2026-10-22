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
  priority: 'High' | 'Medium' | 'Low' | null
  createdAt: string
  updatedAt: string
  createdBy: { id: number; name: string }
  assignedTo: { id: number; name: string } | null
  updatedBy: { id: number; name: string }
}

// One SELECT shape for every read, so the client always gets the same object.
const SELECT = `
  SELECT i.id, i.customer_name AS "customerName", i.contact, i.subject, i.description,
         i.status, i.priority, i.created_at AS "createdAt", i.updated_at AS "updatedAt",
         json_build_object('id', c.id, 'name', c.name) AS "createdBy",
         CASE WHEN a.id IS NULL THEN NULL ELSE json_build_object('id', a.id, 'name', a.name) END AS "assignedTo",
         json_build_object('id', u.id, 'name', u.name) AS "updatedBy"
  FROM inquiries i
  JOIN users c ON c.id = i.created_by
  LEFT JOIN users a ON a.id = i.assigned_to
  JOIN users u ON u.id = i.updated_by
`

// Access rule: staff see inquiries assigned to them or unassigned; managers see all.
export function canAccess(user: User, inquiry: Inquiry) {
  return user.role === 'manager' || inquiry.assignedTo === null || inquiry.assignedTo.id === user.id
}

// Only the assignee or a manager can change status and priority.
export function canModify(user: User, inquiry: Inquiry) {
  return user.role === 'manager' || inquiry.assignedTo?.id === user.id
}

export async function listInquiries(user: User, query: ListQuery): Promise<Inquiry[]> {
  const where: string[] = []
  const params: unknown[] = []

  if (user.role !== 'manager') {
    params.push(user.id)
    where.push(`(i.assigned_to = $${params.length} OR i.assigned_to IS NULL)`)
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
  // New inquiries are unassigned unless the creator takes it or a manager assigns it
  const assignedTo = input.assignedTo ?? null
  if (assignedTo !== null && assignedTo !== user.id && user.role !== 'manager') {
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
  const inquiry = await getInquiry(user, id) // 404 / 403 checks

  if (!canModify(user, inquiry)) {
    throw new AppError('FORBIDDEN', 'Claim this inquiry before changing its status', { reason: 'NOT_ASSIGNEE' })
  }

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

export async function claimInquiry(user: User, id: number): Promise<Inquiry> {
  // Checked before the access rule so a late claimer gets "already claimed", not "forbidden"
  const { rows: found } = await pool.query<Inquiry>(`${SELECT} WHERE i.id = $1`, [id])
  const inquiry = found[0]
  if (!inquiry) throw new AppError('NOT_FOUND', `Inquiry #${id} does not exist`)
  if (inquiry.assignedTo) {
    throw new AppError('CONFLICT', `Already claimed by ${inquiry.assignedTo.name}`, { reason: 'CLAIMED' })
  }

  // Only the first claim finds assigned_to still NULL; a second one gets 0 rows.
  const { rowCount } = await pool.query(
    `UPDATE inquiries SET assigned_to = $1, updated_by = $1, updated_at = now()
     WHERE id = $2 AND assigned_to IS NULL`,
    [user.id, id],
  )
  if (rowCount === 0) {
    const { rows } = await pool.query<Inquiry>(`${SELECT} WHERE i.id = $1`, [id])
    throw new AppError('CONFLICT', `Already claimed by ${rows[0]?.assignedTo?.name ?? 'someone else'}`, { reason: 'CLAIMED' })
  }

  return getInquiry(user, id)
}

// Managers only; deletion is permanent
export async function deleteInquiry(user: User, id: number): Promise<void> {
  if (user.role !== 'manager') throw new AppError('FORBIDDEN', 'Only managers can delete inquiries')
  const { rowCount } = await pool.query('DELETE FROM inquiries WHERE id = $1', [id])
  if (rowCount === 0) throw new AppError('NOT_FOUND', `Inquiry #${id} does not exist`)
}

export async function updateInquiry(user: User, id: number, input: UpdateInquiryInput): Promise<Inquiry> {
  const current = await getInquiry(user, id)

  if (!canModify(user, current)) {
    throw new AppError('FORBIDDEN', 'Claim this inquiry before changing it', { reason: 'NOT_ASSIGNEE' })
  }
  if (input.assignedTo !== undefined && user.role !== 'manager') {
    throw new AppError('FORBIDDEN', 'Only managers can reassign inquiries')
  }

  // Work in progress stays with the person doing it
  const changingAssignee = input.assignedTo !== undefined && input.assignedTo !== (current.assignedTo?.id ?? null)
  if (changingAssignee && current.status === 'In Progress') {
    throw new AppError('CONFLICT', 'This inquiry is already in progress and cannot be reassigned', {
      reason: 'IN_PROGRESS',
    })
  }

  try {
    await pool.query(
      `UPDATE inquiries
       SET priority = COALESCE($1, priority),
           assigned_to = CASE WHEN $2::boolean THEN $3::integer ELSE assigned_to END,
           updated_by = $4, updated_at = now()
       WHERE id = $5`,
      [input.priority === undefined ? null : input.priority, input.assignedTo !== undefined, input.assignedTo ?? null, user.id, id],
    )
  } catch (err) {
    if ((err as { code?: string }).code === '23503') {
      throw new AppError('VALIDATION_ERROR', 'Assigned staff member does not exist', { fields: { assignedTo: 'Unknown staff member' } })
    }
    throw err
  }

  return getInquiry(user, id)
}

import type { Inquiry, Priority, Status, User, UserSummary } from './types'

// Mirrors the server's { error: { code, message, details } } shape
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { fields?: Record<string, string>; existingId?: number; reason?: string; currentStatus?: Status },
  ) {
    super(message)
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch('/api' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.')
  }

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = data?.error ?? { code: 'UNKNOWN', message: 'Something went wrong' }
    throw new ApiError(res.status, err.code, err.message, err.details)
  }
  return data
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>('/auth/login', 'POST', { email, password }),
  logout: () => request<void>('/auth/logout', 'POST'),
  me: () => request<{ user: User }>('/auth/me'),

  listInquiries: (params: { status?: string; q?: string }) => {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (params.q) query.set('q', params.q)
    const qs = query.toString()
    return request<{ inquiries: Inquiry[] }>('/inquiries' + (qs ? '?' + qs : ''))
  },
  getInquiry: (id: string) => request<{ inquiry: Inquiry }>('/inquiries/' + id),
  createInquiry: (input: {
    customerName: string
    contact: string
    subject: string
    description: string
    priority?: Priority | null
  }) => request<{ inquiry: Inquiry }>('/inquiries', 'POST', input),
  changeStatus: (id: number, status: Status, expectedStatus: Status) =>
    request<{ inquiry: Inquiry }>('/inquiries/' + id + '/status', 'PATCH', { status, expectedStatus }),
  updateInquiry: (id: number, input: { priority?: Priority | null; assignedTo?: number }) =>
    request<{ inquiry: Inquiry }>('/inquiries/' + id, 'PATCH', input),

  listUsers: () => request<{ users: UserSummary[] }>('/users'),
}

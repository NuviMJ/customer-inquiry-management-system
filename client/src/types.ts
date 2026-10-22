export type Role = 'staff' | 'manager'
export type Status = 'New' | 'In Progress' | 'Resolved'
export type Priority = 'High' | 'Low'

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

export interface Inquiry {
  id: number
  customerName: string
  contact: string
  subject: string
  description: string
  status: Status
  priority: Priority | null
  createdAt: string
  updatedAt: string
  createdBy: { id: number; name: string }
  assignedTo: { id: number; name: string }
  updatedBy: { id: number; name: string }
}

export const STATUSES: Status[] = ['New', 'In Progress', 'Resolved']

import type { Priority, Status } from '../types'

const statusClass: Record<Status, string> = {
  'New': 'badge-new',
  'In Progress': 'badge-in-progress',
  'Resolved': 'badge-resolved',
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${statusClass[status]}`}>{status}</span>
}

export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return <span className="muted">—</span>
  return <span className={`badge ${priority === 'High' ? 'badge-high' : 'badge-low'}`}>{priority}</span>
}

import type { Priority, Status } from '../types'

const statusClass: Record<Status, string> = {
  'New': 'badge-new',
  'In Progress': 'badge-progress',
  'Resolved': 'badge-resolved',
}

// Icon + label so status is never shown by colour alone
export const statusIcon: Record<Status, string> = {
  'New': '●',
  'In Progress': '◐',
  'Resolved': '✓',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge ${statusClass[status]}`}>
      {statusIcon[status]} {status}
    </span>
  )
}

// Coloured square + label, deliberately different from the status pills
export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return <span className="muted">—</span>
  return (
    <span className={`prio prio-${priority.toLowerCase()}`}>
      <span className="prio-dot"></span>
      {priority}
    </span>
  )
}

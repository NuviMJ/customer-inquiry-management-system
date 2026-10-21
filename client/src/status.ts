import type { Status } from './types'

// Same table as the server; used only to show the right buttons
const transitions: Record<Status, Status[]> = {
  'New': ['In Progress', 'Resolved'],
  'In Progress': ['Resolved'],
  'Resolved': ['In Progress'],
}

export function allowedTransitions(from: Status) {
  return transitions[from]
}

export const actionLabel: Record<Status, string> = {
  'New': 'Mark as New',
  'In Progress': 'Start working',
  'Resolved': 'Mark as resolved',
}

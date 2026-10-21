export type Status = 'New' | 'In Progress' | 'Resolved'

// Allowed moves. Resolved -> New is deliberately missing: reopened work goes back to In Progress.
const transitions: Record<Status, Status[]> = {
  'New': ['In Progress', 'Resolved'],
  'In Progress': ['Resolved'],
  'Resolved': ['In Progress'],
}

export function canTransition(from: Status, to: Status) {
  return transitions[from].includes(to)
}

export function allowedTransitions(from: Status) {
  return transitions[from]
}

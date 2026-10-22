import type { Inquiry } from './types'

// An open inquiry with no change for this long is flagged in red
export const STALE_HOURS = 24

export function hoursSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

export function isOpen(i: Inquiry) {
  return i.status !== 'Resolved'
}

export function isStale(i: Inquiry) {
  return isOpen(i) && hoursSince(i.updatedAt) >= STALE_HOURS
}

export function staleText(i: Inquiry) {
  const hours = Math.floor(hoursSince(i.updatedAt))
  return hours < 48 ? `No update for ${hours}h` : `No update for ${Math.floor(hours / 24)} days`
}

// Higher comes first: high priority + stale, high priority, stale, other open, resolved
export function urgencyScore(i: Inquiry) {
  if (!isOpen(i)) return -1
  return (i.priority === 'High' ? 2 : 0) + (isStale(i) ? 1 : 0)
}

export function sortByUrgency(list: Inquiry[]) {
  return [...list].sort(
    (a, b) => urgencyScore(b) - urgencyScore(a) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

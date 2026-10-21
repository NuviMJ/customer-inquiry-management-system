import { describe, expect, it } from 'vitest'
import { canTransition } from '../src/status.js'

describe('status transition rules', () => {
  it('allows the normal lifecycle', () => {
    expect(canTransition('New', 'In Progress')).toBe(true)
    expect(canTransition('In Progress', 'Resolved')).toBe(true)
  })

  it('allows resolving immediately and reopening', () => {
    expect(canTransition('New', 'Resolved')).toBe(true)
    expect(canTransition('Resolved', 'In Progress')).toBe(true)
  })

  it('blocks moving back to New and no-op changes', () => {
    expect(canTransition('Resolved', 'New')).toBe(false)
    expect(canTransition('In Progress', 'New')).toBe(false)
    expect(canTransition('New', 'New')).toBe(false)
  })
})

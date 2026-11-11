import { describe, expect, it } from 'vitest'

import { shouldShowWeightReminder } from './weightReminder'

describe('shouldShowWeightReminder', () => {
  it('shows when there is no weight entry for today', () => {
    expect(shouldShowWeightReminder([{ day: '2026-11-10' }], '2026-11-11', false)).toBe(true)
  })

  it('hides when a weight entry already exists for today', () => {
    expect(shouldShowWeightReminder([{ day: '2026-11-11' }], '2026-11-11', false)).toBe(false)
  })

  it('does not treat a future entry as today', () => {
    expect(shouldShowWeightReminder([{ day: '2026-11-12' }], '2026-11-11', false)).toBe(true)
  })

  it('hides after dismissal for the current app visit', () => {
    expect(shouldShowWeightReminder([], '2026-11-11', true)).toBe(false)
  })
})

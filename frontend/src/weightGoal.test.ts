import { describe, expect, it } from 'vitest'

import { goalMatchesDirection, remainingWeight } from './weightGoal'

describe('remainingWeight', () => {
  it('shows the kilograms left to lose', () => {
    expect(remainingWeight(80.2, { kg: 75, mode: 'lose' })).toBeCloseTo(5.2)
    expect(remainingWeight(79.8, { kg: 75, mode: 'lose' })).toBeCloseTo(4.8)
  })

  it('shows the kilograms left to gain', () => {
    expect(remainingWeight(80.2, { kg: 85, mode: 'gain' })).toBeCloseTo(4.8)
  })

  it('never reports a negative amount after the goal is reached', () => {
    expect(remainingWeight(75, { kg: 75, mode: 'lose' })).toBe(0)
    expect(remainingWeight(74.5, { kg: 75, mode: 'lose' })).toBe(0)
    expect(remainingWeight(85, { kg: 85, mode: 'gain' })).toBe(0)
    expect(remainingWeight(86, { kg: 85, mode: 'gain' })).toBe(0)
  })

  it('waits for both a measurement and a goal', () => {
    expect(remainingWeight(null, { kg: 75, mode: 'lose' })).toBeNull()
    expect(remainingWeight(80, null)).toBeNull()
  })
})

describe('goalMatchesDirection', () => {
  it('requires a loss target below the latest weight and a gain target above it', () => {
    expect(goalMatchesDirection(80, { kg: 75, mode: 'lose' })).toBe(true)
    expect(goalMatchesDirection(80, { kg: 85, mode: 'lose' })).toBe(false)
    expect(goalMatchesDirection(80, { kg: 85, mode: 'gain' })).toBe(true)
    expect(goalMatchesDirection(80, { kg: 75, mode: 'gain' })).toBe(false)
  })

  it('allows choosing a target before any measurement exists', () => {
    expect(goalMatchesDirection(null, { kg: 75, mode: 'lose' })).toBe(true)
  })
})

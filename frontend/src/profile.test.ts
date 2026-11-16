import { describe, expect, it } from 'vitest'

import { formatDuration, formatLifted, startTime } from './profile'

describe('formatDuration', () => {
  it('shows minutes under an hour', () => {
    expect(formatDuration(48 * 60)).toBe('48 min')
    expect(formatDuration(60)).toBe('1 min')
  })

  it('shows hours and two-digit minutes from an hour', () => {
    expect(formatDuration(65 * 60)).toBe('1 h 05 min')
    expect(formatDuration(2 * 3600 + 30 * 60 + 29)).toBe('2 h 30 min')
  })
})

describe('formatLifted', () => {
  it('shows kilograms under 10 tonnes', () => {
    expect(formatLifted(1000)).toBe('1,000 kg')
    expect(formatLifted(9999.5)).toBe('9,999.5 kg')
  })

  it('shows tonnes from 10,000 kg', () => {
    expect(formatLifted(12400)).toBe('12.4 t')
  })
})

describe('startTime', () => {
  it('is the moment in UTC, as the API expects it', () => {
    expect(startTime(new Date(Date.UTC(2026, 10, 16, 17, 2, 11, 123)))).toBe(
      '2026-11-16T17:02:11.123Z',
    )
  })
})

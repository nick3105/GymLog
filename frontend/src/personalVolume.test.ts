import { describe, expect, it } from 'vitest'

import { personalVolumeDescription } from './personalVolume'

describe('personal exercise volume descriptions', () => {
  it('names the chosen muscle and its direct contribution', () => {
    expect(personalVolumeDescription({ volumeMuscle: 'lower_back', volumeEligible: true })).toBe(
      'Personal exercise - each completed set counts as 1 for lower back',
    )
  })

  it('explains None, timed and legacy exclusions', () => {
    expect(personalVolumeDescription({ volumeMuscle: null })).toContain('None')
    expect(
      personalVolumeDescription({ volumeMuscle: 'abdominals', measurement: 'duration' }),
    ).toContain('timed holds')
    expect(personalVolumeDescription({ volumeEligible: false })).toContain('excluded')
  })
})

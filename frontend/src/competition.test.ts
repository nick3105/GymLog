import { describe, expect, it } from 'vitest'

import { competitionRequest } from './competition'

describe('competition planning in chat', () => {
  it('prefills a supported sport and the date the athlete supplied', () => {
    expect(competitionRequest('Help me prepare for HYROX on 2027-03-14.')).toEqual({
      sport: 'hyrox',
      eventDate: '2027-03-14',
    })
  })

  it('leaves ordinary workout planning and sport questions in chat', () => {
    expect(competitionRequest('Help me build a weekly strength routine.')).toBeNull()
    expect(competitionRequest('What is the marathon distance?')).toBeNull()
  })
})

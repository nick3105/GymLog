import { describe, expect, test } from 'vitest'

import { searchExercises } from './exerciseSearch'

const catalogue = [
  { id: 'bench-press', name: 'Bench press', group: 'Chest' },
  { id: 'incline-bench-press', name: 'Incline bench press', group: 'Chest' },
  { id: 'pull-up', name: 'Pull-up', group: 'Back' },
  { id: 'lat-pulldown', name: 'Lat pulldown', group: 'Back' },
  { id: 'dumbbell-curl', name: 'Dumbbell curl', group: 'Biceps' },
  { id: 'hammer-curls', name: 'Hammer Curls', group: 'Biceps' },
]

const ids = (query: string) => searchExercises(catalogue, query).map((exercise) => exercise.id)

describe('searchExercises', () => {
  test('nothing typed finds nothing', () => {
    expect(ids('')).toEqual([])
    expect(ids('   ')).toEqual([])
  })

  test('ignores capitals, spaces and dashes', () => {
    expect(ids('PULLUP')).toEqual(['pull-up'])
    expect(ids('pull up')).toEqual(['pull-up'])
  })

  test('every word must match, in any order', () => {
    expect(ids('press incline')).toEqual(['incline-bench-press'])
    expect(ids('curl hammer')).toEqual(['hammer-curls'])
  })

  test('the muscle group matches too', () => {
    expect(ids('biceps')).toEqual(['dumbbell-curl', 'hammer-curls'])
  })

  test('names that start with the search come first', () => {
    expect(ids('bench')).toEqual(['bench-press', 'incline-bench-press'])
    expect(ids('pull')).toEqual(['pull-up', 'lat-pulldown'])
    expect(ids('pulldown')).toEqual(['lat-pulldown'])
  })

  test('no match is an empty list', () => {
    expect(ids('zumba')).toEqual([])
  })
})

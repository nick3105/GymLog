import { describe, expect, test } from 'vitest'

import { searchExercises } from './exerciseSearch'

const catalogue = [
  { id: 'bench-press', name: 'Bench press', group: 'Chest' },
  { id: 'incline-bench-press', name: 'Incline bench press', group: 'Chest' },
  { id: 'cable-fly', name: 'Cable fly', group: 'Chest' },
  { id: 'overhead-press', name: 'Overhead press', group: 'Shoulders' },
  { id: 'pull-up', name: 'Pull-up', group: 'Back' },
  { id: 'lat-pulldown', name: 'Lat pulldown', group: 'Back' },
  { id: 'dumbbell-row', name: 'Dumbbell row', group: 'Back' },
  { id: 'dumbbell-curl', name: 'Dumbbell curl', group: 'Biceps' },
  { id: 'hammer-curls', name: 'Hammer Curls', group: 'Biceps' },
  { id: 'narrow-stance-leg-press', name: 'Narrow Stance Leg Press', group: 'Quads' },
  { id: 'romanian-deadlift', name: 'Romanian deadlift', group: 'Hamstrings & glutes' },
  { id: 'cable-crunch', name: 'Cable crunch', group: 'Core' },
]

const ids = (query: string, group = '') =>
  searchExercises(catalogue, query, group).map((exercise) => exercise.id)

describe('searchExercises', () => {
  test('nothing typed and no group finds nothing', () => {
    expect(ids('')).toEqual([])
    expect(ids('  -  ')).toEqual([])
  })

  test('a group with nothing typed lists the whole group in order', () => {
    expect(ids('', 'Back')).toEqual(['pull-up', 'lat-pulldown', 'dumbbell-row'])
  })

  test('a group narrows the search', () => {
    expect(ids('press', 'Shoulders')).toEqual(['overhead-press'])
  })

  test('ignores capitals, spaces, dashes and a plural s', () => {
    expect(ids('PULLUP')).toEqual(['pull-up'])
    expect(ids('pull ups')).toContain('pull-up')
    expect(ids('hammer curl')).toEqual(['hammer-curls'])
    expect(ids('cable flyes')).toEqual(['cable-fly'])
  })

  test('every word must match, in any order', () => {
    expect(ids('press incline')).toEqual(['incline-bench-press'])
  })

  test('the best match comes first', () => {
    expect(ids('bench')).toEqual(['bench-press', 'incline-bench-press'])
    expect(ids('pull')[0]).toBe('pull-up')
    expect(ids('lat pull')[0]).toBe('lat-pulldown')
  })

  test('forgives a typo', () => {
    expect(ids('benhc press')[0]).toBe('bench-press')
    expect(ids('dumbell row')).toEqual(['dumbbell-row'])
    expect(ids('romanain deadlift')).toEqual(['romanian-deadlift'])
  })

  test('understands gym shorthand', () => {
    expect(ids('db row')).toEqual(['dumbbell-row'])
    expect(ids('rdl')).toEqual(['romanian-deadlift'])
    expect(ids('ohp')).toEqual(['overhead-press'])
  })

  test('finds a muscle by its name or nickname', () => {
    expect(ids('biceps')).toEqual(['dumbbell-curl', 'hammer-curls'])
    expect(ids('abs')).toEqual(['cable-crunch'])
    expect(ids('lats')).toEqual(['lat-pulldown', 'pull-up', 'dumbbell-row'])
  })

  test('a short word only matches the start of a word', () => {
    expect(ids('row')).toEqual(['dumbbell-row'])
  })

  test('no match is an empty list', () => {
    expect(ids('zumba')).toEqual([])
  })
})

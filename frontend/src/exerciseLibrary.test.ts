import { describe, expect, it } from 'vitest'

import { groupExercises, photoAlt } from './exerciseLibrary'

describe('photoAlt', () => {
  it('names the exercise and the position', () => {
    expect(photoAlt('Bench press', 0)).toBe('Bench press, start position')
    expect(photoAlt('Bench press', 1)).toBe('Bench press, end position')
  })
})

describe('groupExercises', () => {
  it('keeps groups and exercises in catalogue order', () => {
    const exercises = [
      { id: 'bench-press', name: 'Bench press', group: 'Chest' },
      { id: 'dip', name: 'Dip', group: 'Chest' },
      { id: 'squat', name: 'Squat', group: 'Quads' },
      { id: 'push-up', name: 'Push-up', group: 'Chest' },
    ]
    expect(groupExercises(exercises)).toEqual([
      { group: 'Chest', exercises: [exercises[0], exercises[1], exercises[3]] },
      { group: 'Quads', exercises: [exercises[2]] },
    ])
  })
})

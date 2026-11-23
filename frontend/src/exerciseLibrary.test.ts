import { describe, expect, it } from 'vitest'

import { exerciseOverviewBlocks, groupExercises, photoAlt } from './exerciseLibrary'

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

describe('exerciseOverviewBlocks', () => {
  const benchPress = { id: 'bench-press', name: 'Bench press', group: 'Chest' }
  const paused = { id: 'paused-bench-press', name: 'Paused Bench Press', group: 'Chest' }
  const spoto = { id: 'spoto-bench-press', name: 'Spoto Bench Press', group: 'Chest' }
  const larsen = { id: 'larsen-bench-press', name: 'Larsen Bench Press', group: 'Chest' }
  const squat = { id: 'squat', name: 'Squat', group: 'Quads' }
  const exercises = [benchPress, paused, spoto, larsen, squat]

  it('lists the three bench press variants after every muscle group', () => {
    expect(exerciseOverviewBlocks(exercises, true)).toEqual([
      { group: 'Chest', exercises: [benchPress] },
      { group: 'Quads', exercises: [squat] },
      { group: 'Bench press variants', exercises: [paused, spoto, larsen] },
    ])
  })

  it('keeps filtered results in one list with matching variants last', () => {
    expect(exerciseOverviewBlocks([spoto, squat, benchPress], false)).toEqual([
      { group: '', exercises: [squat, benchPress, spoto] },
    ])
  })
})

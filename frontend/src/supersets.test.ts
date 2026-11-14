import { describe, expect, it } from 'vitest'

import {
  exerciseUnits,
  linkExercises,
  supersetLabel,
  trainingSequence,
  unlinkSuperset,
} from './supersets'

const emptySet = { weight: '', reps: '', rpe: '' }
const exercises = [
  { id: 'bench', name: 'Bench', targets: [1, 2], sets: [emptySet, emptySet] },
  { id: 'plank', name: 'Plank', targets: [3], sets: [emptySet] },
  { id: 'row', name: 'Row', targets: [4, 5, 6], sets: [emptySet, emptySet, emptySet] },
]

describe('superset planning and session order', () => {
  it('pairs adjacent members and moves a pair without losing targets', () => {
    const paired = linkExercises(exercises, 'bench', 'row', 'pair-a')
    expect(paired.map((exercise) => exercise.id)).toEqual(['bench', 'row', 'plank'])
    expect(paired[0].targets).toEqual([1, 2])
    expect(paired[1].targets).toEqual([4, 5, 6])
    expect(exercises[0]).not.toHaveProperty('supersetId')
    const units = exerciseUnits(paired)
    expect(units.map((unit) => unit.exercises.map((exercise) => exercise.id))).toEqual([
      ['bench', 'row'],
      ['plank'],
    ])
    expect(units[0].pairable).toBe(false)
    expect(
      units
        .toReversed()
        .flatMap((unit) => unit.exercises)
        .map((exercise) => exercise.id),
    ).toEqual(['plank', 'bench', 'row'])
  })

  it('alternates uneven paired rows and then finishes the longer member', () => {
    const paired = linkExercises(exercises, 'bench', 'row', 'pair-a')
    expect(trainingSequence(paired)).toEqual([
      { exerciseIndex: 0, setIndex: 0 },
      { exerciseIndex: 1, setIndex: 0 },
      { exerciseIndex: 0, setIndex: 1 },
      { exerciseIndex: 1, setIndex: 1 },
      { exerciseIndex: 1, setIndex: 2 },
      { exerciseIndex: 2, setIndex: 0 },
    ])
    expect(supersetLabel(paired, 0)).toBe('Superset A · A1')
    expect(supersetLabel(paired, 1)).toBe('Superset A · A2')
    expect(supersetLabel(paired, 2)).toBeNull()
  })

  it('unlinks both members and rejects overlapping or self pairs', () => {
    const paired = linkExercises(exercises, 'bench', 'row', 'pair-a')
    expect(linkExercises(paired, 'bench', 'plank', 'pair-b')).toBe(paired)
    expect(linkExercises(exercises, 'bench', 'bench', 'pair-a')).toBe(exercises)
    const unpaired = unlinkSuperset(paired, 'pair-a')
    expect(unpaired.every((exercise) => !('supersetId' in exercise))).toBe(true)
    expect(unpaired.map((exercise) => exercise.targets)).toEqual([[1, 2], [4, 5, 6], [3]])
    expect(trainingSequence(exercises).slice(0, 3)).toEqual([
      { exerciseIndex: 0, setIndex: 0 },
      { exerciseIndex: 0, setIndex: 1 },
      { exerciseIndex: 1, setIndex: 0 },
    ])
  })
})

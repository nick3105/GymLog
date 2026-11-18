import { expect, it } from 'vitest'

import { favoriteExercises } from './exerciseFavorites'
import type { Exercise } from './types'

const exercises: Exercise[] = [
  { id: 'bench-press', name: 'Bench press', group: 'Chest' },
  { id: 'barbell-row', name: 'Barbell row', group: 'Back' },
  { id: 'squat', name: 'Squat', group: 'Quads' },
]

it('lists only favourite exercises in the order the user chose them', () => {
  expect(favoriteExercises(exercises, ['squat', 'bench-press'])).toEqual([
    exercises[2],
    exercises[0],
  ])
})

it('ignores a favourite that is not in this user catalogue', () => {
  expect(favoriteExercises(exercises, ['another-users-private-exercise'])).toEqual([])
})

import type { Exercise } from './types'

// Keep a user's chosen order and ignore IDs that are not in this user's catalogue.
export function favoriteExercises(exercises: Exercise[], favoriteIds: string[]): Exercise[] {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  return favoriteIds.flatMap((exerciseId) => {
    const exercise = byId.get(exerciseId)
    return exercise ? [exercise] : []
  })
}

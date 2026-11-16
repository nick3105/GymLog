import type { Session } from './types'

// A display index of performed exercises, using their latest saved name and training date.
export function exerciseHistory(sessions: Session[], search = '') {
  const newest = [...sessions].sort(
    (a, b) => b.day.localeCompare(a.day) || b.completedAt.localeCompare(a.completedAt),
  )
  const exercises = new Map<
    string,
    { id: string; name: string; day: string; measurement?: 'duration' }
  >()
  for (const session of newest) {
    for (const exercise of session.exercises) {
      if (!exercises.has(exercise.id) && exercise.sets.some((set) => !set.skipped)) {
        exercises.set(exercise.id, {
          id: exercise.id,
          name: exercise.name,
          day: session.day,
          measurement: exercise.measurement,
        })
      }
    }
  }
  const query = search.trim().toLocaleLowerCase()
  return [...exercises.values()].filter((exercise) =>
    exercise.name.toLocaleLowerCase().includes(query),
  )
}

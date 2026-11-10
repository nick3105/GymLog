import type { Exercise } from './types'

// Lowercase letters and digits only, so "pull up", "pull-up" and "Pullups" all compare alike.
function simplify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// The exercises whose name or muscle group contains every word typed, in catalogue order, with
// names that start with what was typed first.
export function searchExercises(exercises: Exercise[], query: string): Exercise[] {
  const words = query.split(/\s+/).map(simplify).filter(Boolean)
  if (words.length === 0) return []
  const matches = exercises.filter((exercise) => {
    const name = simplify(exercise.name)
    const group = simplify(exercise.group)
    return words.every((word) => name.includes(word) || group.includes(word))
  })
  const start = words.join('')
  return [
    ...matches.filter((exercise) => simplify(exercise.name).startsWith(start)),
    ...matches.filter((exercise) => !simplify(exercise.name).startsWith(start)),
  ]
}

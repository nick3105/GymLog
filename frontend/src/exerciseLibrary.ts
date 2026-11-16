// Helpers for the exercise library and the how-to guide (NAV-04, REV-10).
import type { Exercise } from './types'

// Photo 0 shows the start of the movement, photo 1 the end.
export function photoAlt(name: string, index: number): string {
  return `${name}, ${index === 0 ? 'start' : 'end'} position`
}

// One block per muscle group, in the order the catalogue lists them.
export function groupExercises(exercises: Exercise[]): { group: string; exercises: Exercise[] }[] {
  const blocks: { group: string; exercises: Exercise[] }[] = []
  for (const exercise of exercises) {
    let block = blocks.find((item) => item.group === exercise.group)
    if (!block) {
      block = { group: exercise.group, exercises: [] }
      blocks.push(block)
    }
    block.exercises.push(exercise)
  }
  return blocks
}

// Helpers for the exercise library and the how-to guide (NAV-04, REV-10).
import type { Exercise } from './types'

type ExerciseBlock = { group: string; exercises: Exercise[] }

// Photo 0 shows the start of the movement, photo 1 the end.
export function photoAlt(name: string, index: number): string {
  return `${name}, ${index === 0 ? 'start' : 'end'} position`
}

// One block per muscle group, in the order the catalogue lists them.
export function groupExercises(exercises: Exercise[]): ExerciseBlock[] {
  const blocks: ExerciseBlock[] = []
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

const benchPressVariantIds = new Set([
  'paused-bench-press',
  'spoto-bench-press',
  'larsen-bench-press',
])

// Keep the order of the matching exercises within each part of the overview.
export function exerciseOverviewBlocks(
  exercises: Exercise[],
  showMuscleGroups: boolean,
): ExerciseBlock[] {
  const otherExercises: Exercise[] = []
  const benchPressVariants: Exercise[] = []
  for (const exercise of exercises) {
    if (benchPressVariantIds.has(exercise.id)) {
      benchPressVariants.push(exercise)
    } else {
      otherExercises.push(exercise)
    }
  }

  if (!showMuscleGroups) {
    return [{ group: '', exercises: [...otherExercises, ...benchPressVariants] }]
  }
  const blocks = groupExercises(otherExercises)
  if (benchPressVariants.length > 0) {
    blocks.push({ group: 'Bench press variants', exercises: benchPressVariants })
  }
  return blocks
}

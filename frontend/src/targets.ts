import type { Target, TemplateExercise } from './types'

// Older templates have one target for the whole exercise; give every set that target (PLN-10).
export function targetsFor(exercise: TemplateExercise): Target[] {
  if (exercise.targets) return exercise.targets
  const shared = {
    reps: exercise.targetReps ?? 1,
    weight: exercise.targetWeight ?? null,
    rpe: null,
  }
  return Array.from({ length: exercise.sets }, () => shared)
}

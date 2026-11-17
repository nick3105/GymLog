import type { Equipment, Exercise } from './types'

import { searchExercises } from './exerciseSearch'

export const equipmentOptions: { value: Equipment | ''; label: string }[] = [
  { value: '', label: 'All equipment' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbells' },
  { value: 'cable', label: 'Cables' },
  { value: 'machine', label: 'Machines' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'kettlebell', label: 'Kettlebells' },
  { value: 'bands', label: 'Bands' },
  { value: 'other', label: 'Other / unspecified' },
]

// Filter an already-ranked list, keeping private/unspecified exercises available under Other.
export function filterEquipment(exercises: Exercise[], equipment: Equipment | ''): Exercise[] {
  if (!equipment) return exercises
  return exercises.filter((exercise) => (exercise.equipment ?? 'other') === equipment)
}

// Search only when a word or muscle was chosen: equipment alone starts from the whole catalogue.
export function filterExerciseLibrary(
  exercises: Exercise[],
  query: string,
  group: string,
  equipment: Equipment | '',
): Exercise[] {
  const searched =
    query.trim() !== '' || group !== '' ? searchExercises(exercises, query, group) : exercises
  return filterEquipment(searched, equipment)
}

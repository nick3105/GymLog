import type { SetInput } from './oneRepMax'

type GroupedExercise = { id: string; name: string; supersetId?: string }

export function exerciseUnits<T extends GroupedExercise>(exercises: T[]) {
  const units: { id: string; name: string; pairable: boolean; exercises: T[] }[] = []
  for (const exercise of exercises) {
    const previous = units.at(-1)
    if (exercise.supersetId && previous?.exercises[0].supersetId === exercise.supersetId) {
      previous.exercises.push(exercise)
      previous.name = previous.exercises.map((item) => item.name).join(' + ')
      previous.pairable = false
    } else {
      units.push({
        id: exercise.id,
        name: exercise.name,
        pairable: !exercise.supersetId,
        exercises: [exercise],
      })
    }
  }
  return units
}

export function linkExercises<T extends GroupedExercise>(
  exercises: T[],
  firstId: string,
  secondId: string,
  groupId: string,
): T[] {
  const first = exercises.find((exercise) => exercise.id === firstId)
  const second = exercises.find((exercise) => exercise.id === secondId)
  if (!first || !second || first === second || first.supersetId || second.supersetId)
    return exercises
  const changed = exercises.filter((exercise) => exercise.id !== secondId)
  const firstIndex = changed.findIndex((exercise) => exercise.id === firstId)
  changed[firstIndex] = { ...first, supersetId: groupId }
  changed.splice(firstIndex + 1, 0, { ...second, supersetId: groupId })
  return changed
}

export function unlinkSuperset<T extends GroupedExercise>(exercises: T[], groupId: string): T[] {
  return exercises.map((exercise) => {
    if (exercise.supersetId !== groupId) return exercise
    const { supersetId: _, ...unpaired } = exercise
    return unpaired as T
  })
}

export function supersetLabel(exercises: GroupedExercise[], index: number): string | null {
  const groupId = exercises[index].supersetId
  if (!groupId) return null
  const groups = [...new Set(exercises.map((exercise) => exercise.supersetId).filter(Boolean))]
  const letter = String.fromCharCode(65 + groups.indexOf(groupId))
  const member = index > 0 && exercises[index - 1].supersetId === groupId ? 2 : 1
  return `Superset ${letter} · ${letter}${member}`
}

// Alternate paired sets while both exercises have rows, then finish the longer member.
export function trainingSequence(exercises: (GroupedExercise & { sets: SetInput[] })[]) {
  const sequence: { exerciseIndex: number; setIndex: number }[] = []
  for (const unit of exerciseUnits(exercises)) {
    const count = Math.max(...unit.exercises.map((exercise) => exercise.sets.length))
    for (let setIndex = 0; setIndex < count; setIndex += 1) {
      for (const exercise of unit.exercises) {
        if (setIndex < exercise.sets.length) {
          sequence.push({ exerciseIndex: exercises.indexOf(exercise), setIndex })
        }
      }
    }
  }
  return sequence
}

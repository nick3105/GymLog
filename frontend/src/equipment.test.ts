import { expect, it } from 'vitest'

import { filterEquipment, filterExerciseLibrary } from './equipment'
import type { Exercise } from './types'

const exercises: Exercise[] = [
  { id: 'barbell-row', name: 'Barbell row', group: 'Back', equipment: 'barbell' },
  { id: 'cable-row', name: 'Cable row', group: 'Back', equipment: 'cable' },
  { id: 'dumbbell-row', name: 'Dumbbell row', group: 'Back', equipment: 'dumbbell' },
  { id: 'cable-fly', name: 'Cable fly', group: 'Chest', equipment: 'cable' },
  { id: 'private-1', name: 'My row', group: 'Back', source: 'personal' },
]

it('intersects equipment with ranked search and muscle without reordering', () => {
  const ranked = filterExerciseLibrary(exercises, 'row', 'Back', '')
  expect(filterEquipment(ranked, 'cable')).toEqual([exercises[1]])
  expect(filterEquipment(ranked, '')).toEqual(ranked)
  expect(filterExerciseLibrary(exercises, 'fly', 'Back', 'cable')).toEqual([])
})

it('keeps unspecified private exercises under All and Other without changing the source', () => {
  expect(filterEquipment(exercises, 'other')).toEqual([exercises[4]])
  expect(filterEquipment(exercises, '')).toHaveLength(5)
  expect(exercises[4].equipment).toBeUndefined()
})

it('filters all muscle groups when only equipment is selected', () => {
  expect(filterExerciseLibrary(exercises, '', '', 'cable')).toEqual([exercises[1], exercises[3]])
})

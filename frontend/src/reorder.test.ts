import { describe, expect, it } from 'vitest'

import { insertionIndex, moveItem } from './reorder'

describe('exercise order', () => {
  const bench = {
    id: 'bench',
    targets: [
      { reps: '3', weight: '100' },
      { reps: '8', weight: '80' },
    ],
  }
  const squat = { id: 'squat', targets: [{ reps: '5', weight: '90' }] }
  const deadlift = { id: 'deadlift', targets: [{ reps: '6', weight: '120' }] }
  const original = [squat, bench, deadlift]

  it('moves the last exercise first without changing any targets or the original draft', () => {
    const changed = moveItem(original, 2, 0)
    expect(changed.map((item) => item.id)).toEqual(['deadlift', 'squat', 'bench'])
    expect(changed[2]).toBe(bench)
    expect(changed[2].targets).toEqual([
      { reps: '3', weight: '100' },
      { reps: '8', weight: '80' },
    ])
    expect(original).toEqual([squat, bench, deadlift])
  })

  it('moves downward and leaves invalid moves unchanged', () => {
    expect(moveItem(original, 0, 2)).toEqual([bench, deadlift, squat])
    for (const [from, to] of [
      [0, -1],
      [2, 3],
      [-1, 0],
      [0, 0],
    ]) {
      expect(moveItem(original, from, to)).toBe(original)
    }
  })

  it('selects insertion positions around the remaining cards, including either end', () => {
    expect(insertionIndex(10, [100, 300])).toBe(0)
    expect(insertionIndex(200, [100, 300])).toBe(1)
    expect(insertionIndex(400, [100, 300])).toBe(2)
    expect(insertionIndex(100, [])).toBe(0)
  })
})

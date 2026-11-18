import { describe, expect, it } from 'vitest'

import { barPercent, notTrainedSentence } from './bodyLoad'

describe('barPercent', () => {
  it('sizes a bar by its share of the busiest group', () => {
    expect(barPercent(6, 12)).toBe(50)
    expect(barPercent(12, 12)).toBe(100)
  })

  it('is empty when nothing was trained', () => {
    expect(barPercent(0, 0)).toBe(0)
  })
})

describe('notTrainedSentence', () => {
  it('names every group with no sets', () => {
    const groups = [
      { group: 'Chest', sets: 4 },
      { group: 'Calves', sets: 0 },
      { group: 'Forearms', sets: 0 },
    ]
    expect(notTrainedSentence(groups)).toBe('Not trained: Calves, Forearms.')
  })

  it('is empty when every group was trained', () => {
    expect(notTrainedSentence([{ group: 'Chest', sets: 4 }])).toBe('')
  })
})

import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { emptyJournal, JournalStore, type JournalContext } from './journal'
import Home from './pages/Home'
import Review from './pages/Review'
import ExerciseProgress from './pages/ExerciseProgress'
import type { Journal } from './types'

function page(Page: typeof Home, journal: Journal) {
  const context: JournalContext = {
    status: 'signed-in',
    username: 'preview',
    journal,
    active: null,
    setJournal: () => {},
    weightReminderDismissed: false,
    dismissWeightReminder: () => {},
    refresh: async () => {},
    signIn: async () => {},
    signOut: async () => {},
    setActive: () => {},
    setBuilderDirty: () => {},
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <JournalStore value={context}>
        <Page />
      </JournalStore>
    </MemoryRouter>,
  )
}

describe('separate workout creation and review', () => {
  it('links to exercise progress beside weekly volume, with a searchable empty state', () => {
    const review = page(Review, emptyJournal)
    expect(review).toContain('href="/review/progress"')
    expect(review).toContain('Exercise Progress')
    const progress = page(ExerciseProgress, emptyJournal)
    expect(progress).toContain('type="search"')
    expect(progress).toContain('Finish a workout to see your exercise progress here.')
  })
  it('gives new users a first-workout action on Home while Review stays separate', () => {
    const home = page(Home, emptyJournal)
    expect(home).toContain('Create your first workout here')
    expect(home).toContain('href="/create"')
    expect(page(Review, emptyJournal)).not.toContain('href="/create"')
  })

  it('keeps a separate Home creation card after a routine exists', () => {
    const journal: Journal = {
      ...emptyJournal,
      templates: [
        {
          id: 'upper',
          name: 'Upper',
          createdAt: '2026-11-16T12:00:00Z',
          exercises: [
            {
              id: 'bench-press',
              name: 'Bench press',
              sets: 1,
              targets: [{ reps: 8, weight: null, rpe: null }],
            },
          ],
        },
      ],
    }
    const home = page(Home, journal)
    const review = page(Review, journal)
    expect(home).not.toContain('Create your first workout here')
    expect(home).toContain('href="/create"')
    expect(home).toContain('Create workout')
    expect(review).not.toContain('href="/create"')
    expect(review).not.toContain('href="/review/create"')
    expect(review).not.toContain('Review and Create')
    expect(review).not.toContain('Create your first workout here')
  })
})

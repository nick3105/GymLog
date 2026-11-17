import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { emptyJournal, JournalStore, type ActiveWorkout, type JournalContext } from './journal'
import Home from './pages/Home'
import Start from './pages/Start'

const workout: ActiveWorkout = {
  clientId: 'workout-1',
  templateId: 'upper',
  name: 'Upper A',
  day: '2026-11-17',
  exercises: [],
}

function renderPage(Page: typeof Home | typeof Start, draftStatus: JournalContext['draftStatus']) {
  const context: JournalContext = {
    status: 'signed-in',
    username: 'annalisa',
    journal: {
      ...emptyJournal,
      templates: [
        {
          id: 'upper',
          name: 'Upper A',
          createdAt: '2026-11-17T12:00:00Z',
          exercises: [{ id: 'bench-press', name: 'Bench Press', sets: 1, targetReps: 8 }],
        },
      ],
    },
    active: workout,
    draftStatus,
    setJournal: () => {},
    weightReminderDismissed: false,
    dismissWeightReminder: () => {},
    refresh: async () => {},
    signIn: async () => {},
    signOut: async () => {},
    setActive: () => {},
    discardActiveDraft: async () => {},
    retryDraft: () => {},
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

describe('active workout draft entry points', () => {
  it('keeps the Home page free of a duplicate workout notice', () => {
    const home = renderPage(Home, 'saved')
    expect(home).not.toContain('Workout in progress')
    expect(home).not.toContain('Resume workout')
  })

  it('keeps discard available on Start without repeating the workout notice', () => {
    const start = renderPage(Start, 'saved')
    expect(start).not.toContain('Workout in progress')
    expect(start).not.toContain('Resume workout')
    expect(start).toContain('Discard workout')
    expect(start).toContain('disabled=""')
  })

  it('offers a retry action when the latest draft save failed', () => {
    expect(renderPage(Home, 'error')).toContain('Check again')
    expect(renderPage(Start, 'error')).toContain('Check again')
  })
})

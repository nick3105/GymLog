import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AssistantDraftStore, emptyJournal, JournalStore, type JournalContext } from './journal'
import Create from './pages/Create'
import Session from './pages/Session'
import { bestOneRepMax } from './oneRepMax'
import { setPayload } from './setInput'
import type { Template } from './types'

function renderWorkout(page: 'create' | 'edit' | 'scheduled' | 'session', rpeEnabled?: boolean) {
  const template: Template = {
    id: 'upper',
    name: 'Upper',
    createdAt: '2026-11-22T12:00:00Z',
    ...(rpeEnabled === undefined ? {} : { rpeEnabled }),
    exercises: [
      {
        id: 'bench-press',
        name: 'Bench Press',
        sets: 1,
        targets: [{ weight: 100, reps: 5, rpe: 8 }],
      },
    ],
  }
  const context: JournalContext = {
    status: 'signed-in',
    username: 'preview',
    journal: { ...emptyJournal, templates: [template] },
    active:
      page === 'session'
        ? {
            ...template,
            clientId: 'active-1',
            templateId: template.id,
            day: '2026-11-22',
            exercises: [
              {
                id: 'bench-press',
                name: 'Bench Press',
                targets: [{ weight: 100, reps: 5, rpe: 8 }],
                sets: [{ weight: '100', reps: '5', rpe: '8' }],
              },
            ],
          }
        : null,
    draftStatus: 'saved',
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
  const router = createMemoryRouter(
    [
      { path: '/create', element: <Create /> },
      { path: '/edit/:id', element: <Create /> },
      {
        path: '/scheduled',
        element: (
          <Create
            scheduled={{ workout: template, returnPath: '/schedule', save: async () => {} }}
          />
        ),
      },
      { path: '/session', element: <Session /> },
    ],
    { initialEntries: [page === 'edit' ? '/edit/upper' : `/${page}`] },
  )
  return renderToStaticMarkup(
    <JournalStore value={context}>
      <AssistantDraftStore value={{ draft: null, setDraft: () => {} }}>
        <RouterProvider router={router} />
      </AssistantDraftStore>
    </JournalStore>,
  )
}

describe('workout RPE toggle', () => {
  it('saves null effort for repetition and timed sets when RPE is off', () => {
    const set = { weight: '100', reps: '5', rpe: '8' }
    expect(setPayload(set, false)).toEqual({ weight: 100, reps: 5, rpe: null })
    expect(setPayload({ ...set, durationSeconds: '30' }, false)).toEqual({
      durationSeconds: 30,
      rpe: null,
    })
    expect(setPayload({ ...set, skipped: true }, false)).toEqual({ skipped: true })
  })

  it('ignores malformed hidden effort and keeps weight-only estimates when enabled but blank', () => {
    expect(bestOneRepMax([{ weight: '100', reps: '5', rpe: 'stale input' }], false)).toBe(116.7)
    expect(bestOneRepMax([{ weight: '100', reps: '5', rpe: '' }], true)).toBe(116.7)
  })

  it('defaults new workouts off', () => {
    const markup = renderWorkout('create')
    expect(markup).toContain('Use RPE')
    expect(markup).toContain('role="switch"')
    expect(markup).toContain('aria-checked="false"')
  })

  it('keeps older workouts on, even without an explicit setting', () => {
    expect(renderWorkout('edit')).toContain('aria-checked="true"')
  })

  it('restores the saved setting when editing', () => {
    expect(renderWorkout('edit', false)).toContain('aria-checked="false"')
    expect(renderWorkout('edit', true)).toContain('aria-checked="true"')
  })

  it('keeps the RPE setting when adjusting a scheduled workout', () => {
    expect(renderWorkout('scheduled', false)).toContain('aria-checked="false"')
    expect(renderWorkout('scheduled', true)).toContain('aria-checked="true"')
    expect(renderWorkout('scheduled')).toContain('aria-checked="true"')
  })

  it('hides actual RPE and ignores hidden values for the live estimate', () => {
    const markup = renderWorkout('session', false)
    expect(markup).not.toContain('aria-label="Bench Press, set 1, RPE"')
    expect(markup).toContain('116.7 kg')
    expect(markup).not.toContain('123.3 kg')
  })

  it('keeps RPE inputs and the adjusted estimate for enabled and legacy drafts', () => {
    for (const enabled of [true, undefined]) {
      const markup = renderWorkout('session', enabled)
      expect(markup).toContain('aria-label="Bench Press, set 1, RPE"')
      expect(markup).toContain('123.3 kg')
    }
  })
})

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { api, setCsrf } from './api'
import {
  emptyJournal,
  JournalStore,
  type ActiveWorkout,
  type DraftStatus,
  type JournalContext,
} from './journal'
import type { Journal as JournalData } from './types'

type SessionStatus = { authenticated: boolean; username: string | null; csrf: string }

export default function JournalProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<JournalContext['status']>('loading')
  const [username, setUsername] = useState('')
  const [journal, setJournalState] = useState<JournalData>(emptyJournal)
  const [weightReminderDismissed, setWeightReminderDismissed] = useState(false)
  const [active, setActiveState] = useState<ActiveWorkout | null>(null)
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('loading')
  const [builderDirty, setBuilderDirty] = useState(false)
  const latestDraft = useRef<ActiveWorkout | null>(null)
  const draftTimer = useRef<number | null>(null)
  const draftRevision = useRef(0)
  const draftAction = useRef<'save' | 'discard'>('save')
  const draftQueue = useRef<Promise<void>>(Promise.resolve())

  function enqueueDraftRequest(request: () => Promise<unknown>) {
    const pending = draftQueue.current.then(request)
    draftQueue.current = pending.then(
      () => undefined,
      () => undefined,
    )
    return pending
  }

  function saveDraft(workout: ActiveWorkout, revision: number) {
    draftAction.current = 'save'
    void enqueueDraftRequest(() => api('workout-draft', workout)).then(
      () => {
        if (revision === draftRevision.current) setDraftStatus('saved')
      },
      () => {
        if (revision === draftRevision.current) setDraftStatus('error')
      },
    )
  }

  function deleteDraft(revision: number) {
    draftAction.current = 'discard'
    void enqueueDraftRequest(() => api('workout-draft/discard', {})).then(
      () => {
        if (revision === draftRevision.current) {
          latestDraft.current = null
          setActiveState(null)
          setDraftStatus('idle')
        }
      },
      () => {
        if (revision === draftRevision.current) setDraftStatus('error')
      },
    )
  }

  const enter = useCallback(async (name: string) => {
    setDraftStatus('loading')
    const data = await api<JournalData>('state')
    setJournalState(data)
    setWeightReminderDismissed(false)
    setUsername(name)
    draftRevision.current += 1
    try {
      const result = await api<{ draft: ActiveWorkout | null }>('workout-draft')
      latestDraft.current = result.draft
      setActiveState(result.draft)
      setDraftStatus(result.draft ? 'saved' : 'idle')
    } catch {
      latestDraft.current = null
      setActiveState(null)
      setDraftStatus('error')
    }
    setStatus('signed-in')
  }, [])

  useEffect(() => {
    api<SessionStatus>('session')
      .then((session) => {
        setCsrf(session.csrf)
        if (session.authenticated && session.username) return enter(session.username)
        setDraftStatus('idle')
        setStatus('signed-out')
      })
      .catch(() => {
        setDraftStatus('error')
        setStatus('signed-out')
      })
  }, [enter])

  const setActive = useCallback((workout: ActiveWorkout | null) => {
    const revision = ++draftRevision.current
    if (draftTimer.current !== null) window.clearTimeout(draftTimer.current)
    latestDraft.current = workout
    setActiveState(workout)
    if (!workout) {
      setDraftStatus('idle')
      deleteDraft(revision)
      return
    }
    draftAction.current = 'save'
    setDraftStatus('saving')
    draftTimer.current = window.setTimeout(() => saveDraft(workout, revision), 500)
  }, [])

  const discardActiveDraft = useCallback(async () => {
    const revision = ++draftRevision.current
    if (draftTimer.current !== null) window.clearTimeout(draftTimer.current)
    draftTimer.current = null
    setDraftStatus('saving')
    draftAction.current = 'discard'
    try {
      await enqueueDraftRequest(() => api('workout-draft/discard', {}))
      latestDraft.current = null
      setActiveState(null)
      setDraftStatus('idle')
    } catch (error) {
      if (revision === draftRevision.current) setDraftStatus('error')
      throw error
    }
  }, [])

  const retryDraft = useCallback(() => {
    const revision = ++draftRevision.current
    if (draftTimer.current !== null) window.clearTimeout(draftTimer.current)
    draftTimer.current = null
    setDraftStatus('saving')
    if (draftAction.current === 'discard') {
      deleteDraft(revision)
    } else if (latestDraft.current) {
      saveDraft(latestDraft.current, revision)
    } else {
      setDraftStatus('loading')
      void api<{ draft: ActiveWorkout | null }>('workout-draft').then(
        (result) => {
          if (revision !== draftRevision.current) return
          latestDraft.current = result.draft
          setActiveState(result.draft)
          setDraftStatus(result.draft ? 'saved' : 'idle')
        },
        () => {
          if (revision === draftRevision.current) setDraftStatus('error')
        },
      )
    }
  }, [])

  // Only warn before leaving while the latest values are still being sent or need a retry.
  useEffect(() => {
    if ((!active || draftStatus === 'saved') && !builderDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active, draftStatus, builderDirty])

  const value = useMemo<JournalContext>(
    () => ({
      status,
      username,
      journal,
      setJournal: (update) => setJournalState(update),
      weightReminderDismissed,
      dismissWeightReminder: () => setWeightReminderDismissed(true),
      refresh: async () => setJournalState(await api<JournalData>('state')),
      signIn: async (path, name, password) => {
        await api<SessionStatus>('session')
        const result = await api<{ username: string }>(path, { username: name, password })
        await enter(result.username)
      },
      signOut: async () => {
        const unsavedBuilder = builderDirty
        if (unsavedBuilder && !window.confirm('Sign out and lose your unfinished workout plan?'))
          return
        if (active && draftStatus !== 'saved') {
          const revision = ++draftRevision.current
          if (draftTimer.current !== null) window.clearTimeout(draftTimer.current)
          draftTimer.current = null
          setDraftStatus('saving')
          try {
            await enqueueDraftRequest(() => api('workout-draft', active))
            if (revision === draftRevision.current) setDraftStatus('saved')
          } catch (error) {
            if (revision === draftRevision.current) setDraftStatus('error')
            throw error
          }
        }
        if (
          active &&
          !window.confirm('Sign out? Your saved workout draft will stay in your account.')
        )
          return
        await api('logout', {})
        if (draftTimer.current !== null) window.clearTimeout(draftTimer.current)
        latestDraft.current = null
        setActiveState(null)
        setDraftStatus('idle')
        setBuilderDirty(false)
        setJournalState(emptyJournal)
        setWeightReminderDismissed(false)
        setUsername('')
        setStatus('signed-out')
      },
      active,
      draftStatus,
      setActive,
      discardActiveDraft,
      retryDraft,
      setBuilderDirty,
    }),
    [
      status,
      username,
      journal,
      active,
      draftStatus,
      enter,
      setActive,
      discardActiveDraft,
      retryDraft,
      builderDirty,
      weightReminderDismissed,
    ],
  )

  return <JournalStore value={value}>{children}</JournalStore>
}

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, setCsrf } from './api'
import { emptyJournal, JournalStore, type ActiveWorkout, type JournalContext } from './journal'
import type { Journal as JournalData } from './types'

type SessionStatus = { authenticated: boolean; username: string | null; csrf: string }

// The workout in progress lives in sessionStorage, so locking the phone, switching apps or
// reloading the page does not lose it. It is per user and never sent anywhere until Finish.
function storageKey(username: string) {
  return `gymlog-active-${username}`
}

function loadActive(username: string): ActiveWorkout | null {
  try {
    const saved = sessionStorage.getItem(storageKey(username))
    return saved ? (JSON.parse(saved) as ActiveWorkout) : null
  } catch {
    return null
  }
}

export default function JournalProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<JournalContext['status']>('loading')
  const [username, setUsername] = useState('')
  const [journal, setJournalState] = useState<JournalData>(emptyJournal)
  const [weightReminderDismissed, setWeightReminderDismissed] = useState(false)
  const [active, setActiveState] = useState<ActiveWorkout | null>(null)
  const [builderDirty, setBuilderDirty] = useState(false)

  const enter = useCallback(async (name: string) => {
    const data = await api<JournalData>('state')
    setJournalState(data)
    setWeightReminderDismissed(false)
    setUsername(name)
    setActiveState(loadActive(name))
    setStatus('signed-in')
  }, [])

  useEffect(() => {
    api<SessionStatus>('session')
      .then((session) => {
        setCsrf(session.csrf)
        if (session.authenticated && session.username) return enter(session.username)
        setStatus('signed-out')
      })
      .catch(() => setStatus('signed-out'))
  }, [enter])

  const setActive = useCallback(
    (workout: ActiveWorkout | null) => {
      setActiveState(workout)
      try {
        if (workout) sessionStorage.setItem(storageKey(username), JSON.stringify(workout))
        else sessionStorage.removeItem(storageKey(username))
      } catch {
        // Private browsing can refuse storage; the workout still works until the tab closes.
      }
    },
    [username],
  )

  // Closing the tab loses a workout that is not finished; the browser asks first.
  useEffect(() => {
    if (!active && !builderDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active, builderDirty])

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
        const unsaved = active !== null || builderDirty
        if (unsaved && !window.confirm('Sign out and lose your unfinished workout?')) return
        await api('logout', {})
        setActive(null)
        setBuilderDirty(false)
        setJournalState(emptyJournal)
        setWeightReminderDismissed(false)
        setUsername('')
        setStatus('signed-out')
      },
      active,
      setActive,
      setBuilderDirty,
    }),
    [status, username, journal, active, builderDirty, enter, setActive, weightReminderDismissed],
  )

  return <JournalStore value={value}>{children}</JournalStore>
}

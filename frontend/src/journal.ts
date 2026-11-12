// What every page can read: who is signed in, their journal, and the workout in progress.
import { createContext, useContext } from 'react'

import type { SetInput } from './oneRepMax'
import type { Journal as JournalData, Target } from './types'

export type ActiveWorkout = {
  // One ID per workout, so pressing Finish twice (or retrying after a network error) saves once.
  clientId: string
  templateId: string
  name: string
  day: string
  exercises: {
    id: string
    name: string
    measurement?: 'duration'
    targets: Target[]
    sets: SetInput[]
  }[]
}

export type JournalContext = {
  status: 'loading' | 'signed-out' | 'signed-in'
  username: string
  journal: JournalData
  setJournal: (update: (journal: JournalData) => JournalData) => void
  refresh: () => Promise<void>
  signIn: (path: 'login' | 'register', username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  active: ActiveWorkout | null
  setActive: (workout: ActiveWorkout | null) => void
  // The workout builder reports unsaved typing here, so signing out can warn first.
  setBuilderDirty: (dirty: boolean) => void
}

export const emptyJournal: JournalData = { exercises: [], templates: [], sessions: [], weights: [] }

export const JournalStore = createContext<JournalContext | null>(null)

export function useJournal(): JournalContext {
  const context = useContext(JournalStore)
  if (context === null) throw new Error('useJournal must be used inside JournalProvider.')
  return context
}

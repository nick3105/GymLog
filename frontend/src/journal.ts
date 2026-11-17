// What every page can read: who is signed in, their journal, and the workout in progress.
import { createContext, useContext } from 'react'

import type { SetInput } from './oneRepMax'
import type { Journal as JournalData, Target } from './types'

export type ActiveWorkout = {
  note?: string
  // One ID per workout, so pressing Finish twice (or retrying after a network error) saves once.
  clientId: string
  // When Start was tapped (RUN-11); drafts from before this have none.
  startedAt?: string
  templateId: string
  name: string
  day: string
  warmup?: string
  cooldown?: string
  warmupDone?: boolean
  cooldownDone?: boolean
  exercises: {
    id: string
    name: string
    note?: string
    source?: 'personal'
    volumeEligible?: false
    measurement?: 'duration'
    supersetId?: string
    targets: Target[]
    sets: SetInput[]
  }[]
}

export type DraftStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error'

export type JournalContext = {
  status: 'loading' | 'signed-out' | 'signed-in'
  username: string
  journal: JournalData
  setJournal: (update: (journal: JournalData) => JournalData) => void
  weightReminderDismissed: boolean
  dismissWeightReminder: () => void
  refresh: () => Promise<void>
  signIn: (path: 'login' | 'register', username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  active: ActiveWorkout | null
  draftStatus: DraftStatus
  setActive: (workout: ActiveWorkout | null) => void
  discardActiveDraft: () => Promise<void>
  retryDraft: () => void
  // The workout builder reports unsaved typing here, so signing out can warn first.
  setBuilderDirty: (dirty: boolean) => void
}

export const emptyJournal: JournalData = {
  exercises: [],
  templates: [],
  sessions: [],
  weights: [],
  weightGoal: null,
}

export const JournalStore = createContext<JournalContext | null>(null)

export function useJournal(): JournalContext {
  const context = useContext(JournalStore)
  if (context === null) throw new Error('useJournal must be used inside JournalProvider.')
  return context
}

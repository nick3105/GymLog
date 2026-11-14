import type { Exercise, Session, Template } from './types'

export type CoachingRelationship = {
  id: string
  coachee_id: number
  coach_id: number
  coachee: string
  coach: string
  state: 'pending' | 'accepted'
}

export type CoachingState = { userId: number; relationships: CoachingRelationship[] }
export type CoacheeJournal = {
  owner: { id: number; username: string }
  exercises: Exercise[]
  templates: (Template & { createdBy?: { id: number; username: string } })[]
  sessions: Session[]
}

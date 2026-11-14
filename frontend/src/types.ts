// The shapes the API sends and receives. The API (backend/gymlog/models.py) is the source of truth.

export type Exercise = { id: string; name: string; group: string; measurement?: 'duration' }

export type Target = (
  | { reps: number; weight: number | null; durationSeconds?: never }
  | { durationSeconds: number; reps?: never; weight?: never }
) & { rpe: number | null }

export type TemplateExercise = {
  supersetId?: string
  measurement?: 'duration'
  id: string
  name: string
  sets: number
  // New templates have one target per set; older ones have one target for the whole exercise.
  targets?: Target[]
  targetReps?: number
  targetWeight?: number | null
}

export type Template = {
  id: string
  name: string
  createdAt: string
  warmup?: string
  cooldown?: string
  exercises: TemplateExercise[]
}

export type LoggedSet =
  | ({ skipped?: false; rpe: number | null } & (
      | { weight: number; reps: number; durationSeconds?: never }
      | { durationSeconds: number; weight?: never; reps?: never }
    ))
  | { skipped: true }

export type Session = {
  id: string
  templateId: string
  name: string
  day: string
  completedAt: string
  warmup?: string
  cooldown?: string
  warmupDone?: boolean
  cooldownDone?: boolean
  exercises: {
    id: string
    name: string
    sets: LoggedSet[]
    measurement?: 'duration'
    supersetId?: string
    plannedSets?: number
    estimated1rm: number | null
  }[]
}

export type Weight = { day: string; kg: number }

export type Journal = {
  exercises: Exercise[]
  templates: Template[]
  sessions: Session[]
  weights: Weight[]
}

export type ExerciseStats = {
  averageWeight?: {
    points: { day: string; weight: number }[]
    best: number | null
    latest: number | null
  }
  last: { day: string; sets: LoggedSet[] } | null
  points: { day: string; estimate: number }[]
  best: number | null
  latest: number | null
}

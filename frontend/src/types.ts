// The shapes the API sends and receives. The API (backend/gymlog/models.py) is the source of truth.

export type Exercise = { id: string; name: string; group: string; measurement?: 'duration' }

export type Target = (
  | { reps: number; weight: number | null; durationSeconds?: never }
  | { durationSeconds: number; reps?: never; weight?: never }
) & { rpe: number | null }

export type TemplateExercise = {
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
  exercises: {
    id: string
    name: string
    sets: LoggedSet[]
    measurement?: 'duration'
    plannedSets?: number
    estimated1rm: number | null
  }[]
}

export type Weight = { day: string; kg: number }
export type WeightGoal = { kg: number; mode: 'lose' | 'gain' }

export type Journal = {
  exercises: Exercise[]
  templates: Template[]
  sessions: Session[]
  weights: Weight[]
  weightGoal: WeightGoal | null
}

export type LoadTotals = { sets: number; volumeKg: number; durationSeconds: number }

export type BodyLoad = {
  groups: (LoadTotals & {
    group: string
    // 0 untrained, 1 light, 2 medium, 3 most — relative to the busiest group.
    level: 0 | 1 | 2 | 3
    exercises: (LoadTotals & { id: string; name: string })[]
  })[]
}

export type ExerciseStats = {
  last: { day: string; sets: LoggedSet[] } | null
  points: { day: string; estimate: number }[]
  best: number | null
  latest: number | null
}

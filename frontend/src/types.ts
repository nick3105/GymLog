// The shapes the API sends and receives. The API (backend/gymlog/models.py) is the source of truth.

export type Exercise = { id: string; name: string; group: string }

export type Target = { reps: number; weight: number | null; rpe: number | null }

export type TemplateExercise = {
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

export type LoggedSet = { weight: number; reps: number; rpe: number | null }

export type Session = {
  id: string
  templateId: string
  name: string
  day: string
  completedAt: string
  exercises: { id: string; name: string; sets: LoggedSet[]; estimated1rm: number | null }[]
}

export type Weight = { day: string; kg: number }

export type Journal = {
  exercises: Exercise[]
  templates: Template[]
  sessions: Session[]
  weights: Weight[]
}

export type ExerciseStats = {
  last: { day: string; sets: LoggedSet[] } | null
  points: { day: string; estimate: number }[]
  best: number | null
  latest: number | null
}

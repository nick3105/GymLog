// The shapes the API sends and receives. The API (backend/gymlog/models.py) is the source of truth.

export type Equipment =
  'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'kettlebell' | 'bands' | 'other'

export type Exercise = {
  equipment?: Equipment
  thumbnail?: string
  id: string
  name: string
  group: string
  measurement?: 'duration' | 'repetitions'
  source?: 'personal'
  volumeEligible?: boolean
  volumeMuscle?: string | null
}

export type Target = (
  | { reps: number; weight: number | null; durationSeconds?: never }
  | { durationSeconds: number; reps?: never; weight?: never }
) & { rpe: number | null }

export type TemplateExercise = {
  note?: string
  source?: 'personal'
  volumeEligible?: boolean
  volumeMuscle?: string | null
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
  note?: string
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
  note?: string
  revision?: number
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
    note?: string
    source?: 'personal'
    volumeEligible?: boolean
    volumeMuscle?: string | null
    sets: LoggedSet[]
    measurement?: 'duration'
    supersetId?: string
    plannedSets?: number
    estimated1rm: number | null
  }[]
}

export type Weight = { day: string; kg: number }

// GET /api/profile (REV-11). Each record or favourite is null until there is data for it.
export type Profile = {
  bio: string
  avatar: string | null
  level: { name: string; next: string | null; toNextLevel: number | null }
  overview: {
    workouts: number
    sets: number
    reps: number
    liftedKg: number
    heldSeconds: number
    exercises: number
  }
  consistency: {
    currentStreakWeeks: number
    longestStreakWeeks: number
    thisWeek: number
    thisMonth: number
    perWeek: number | null
    trainingDaysLast30: number
  }
  duration: {
    recordedSince: string | null
    count: number
    averageSeconds: number | null
    totalSeconds: number
    longestSeconds: number | null
  }
  averages: { setsPerWorkout: number | null; weightPerSet: number | null; rpe: number | null }
  records: {
    heaviestSet: { weight: number; reps: number; exercise: string; day: string } | null
    best1rm: { estimate: number; exercise: string; day: string } | null
    biggestWorkout: { liftedKg: number; name: string; day: string } | null
    mostReps: { reps: number; exercise: string; day: string } | null
  }
  favourites: {
    exercise: { name: string; sets: number } | null
    workout: { name: string; count: number } | null
    group: { name: string; sets: number } | null
  }
  bodyWeight: { latest: Weight | null; change: number | null; since: string | null }
}
export type WeightGoal = { kg: number; mode: 'lose' | 'gain' }

export type Journal = {
  exercises: Exercise[]
  favoriteExerciseIds: string[]
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

// Both lists are empty when there is no guide for the exercise.
export type ExerciseGuide = { steps: string[]; images: string[] }

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

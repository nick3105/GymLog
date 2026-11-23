export const competitionSports = {
  powerlifting: 'Powerlifting',
  hyrox: 'HYROX',
  marathon: 'Marathon',
} as const

export const preparationStages = {
  'getting-started': 'Getting started',
  training: 'Training consistently',
  'in-progress': 'Partway through a programme',
  'race-ready': 'Final preparation',
} as const

export const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export type CompetitionSport = keyof typeof competitionSports
export type PreparationStage = keyof typeof preparationStages
export type CompetitionSeed = { sport?: CompetitionSport; eventDate?: string }

export type CompetitionIntake = {
  sport: CompetitionSport
  stage: PreparationStage
  eventName: string
  eventDate: string
  today: string
  recentTraining: string
  goal: string
  equipment: string
  sessionsPerWeek: number
  minutesPerSession: number
  weekdays: number[]
}

export const workoutKinds = {
  strength: 'Strength',
  run: 'Run',
  station: 'Stations',
  hybrid: 'Run and stations',
} as const

export type CompetitionWorkout = {
  name: string
  kind: keyof typeof workoutKinds
  minutes: number
  steps: string[]
  day: string | null
}

export type CompetitionWeek = { week: string; focus: string; sessions: CompetitionWorkout[] }

export type CompetitionCalendar = {
  revision: number
  existing: Record<string, number>
}

export type CompetitionDraft = CompetitionCalendar & {
  intake: CompetitionIntake
  plan: { summary: string; weeks: CompetitionWeek[] }
}

export type CompetitionScheduleEntry = { id: string; eventName: string } & (
  | { kind: 'event'; day: string; name: string }
  | (CompetitionWorkout & { position: number; focus: string })
)

export function competitionRequest(message: string): CompetitionSeed | null {
  if (
    !/\b(prep(?:are|aring|aration)?|plan(?:ning)?|train(?:ing)?|programme?|build)\b/i.test(message)
  )
    return null
  const match = /\b(powerlifting|hyrox|marathon)\b/i.exec(message)
  const sport = match?.[1].toLowerCase() as CompetitionSport | undefined
  if (!sport && !/\b(competition|race|meet)\b/i.test(message)) return null
  return { sport, eventDate: /\b\d{4}-\d{2}-\d{2}\b/.exec(message)?.[0] }
}

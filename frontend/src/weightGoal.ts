import type { WeightGoal } from './types'

export function remainingWeight(latestWeight: number | null, goal: WeightGoal | null) {
  if (latestWeight === null || goal === null) return null
  return goal.mode === 'lose'
    ? Math.max(latestWeight - goal.kg, 0)
    : Math.max(goal.kg - latestWeight, 0)
}

export function goalMatchesDirection(latestWeight: number | null, goal: WeightGoal) {
  if (latestWeight === null) return true
  return goal.mode === 'lose' ? goal.kg < latestWeight : goal.kg > latestWeight
}

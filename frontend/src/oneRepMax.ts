// The BRD "Estimated 1RM rule", for the live estimate while typing (RUN-08).
// It copies estimated_1rm in backend/gymlog/models.py; oneRepMax.test.ts uses the same
// examples as test_estimate_rules in backend/tests/test_api.py so the two cannot drift.

export type SetInput = {
  weight: string
  reps: string
  rpe: string
  durationSeconds?: string
  skipped?: boolean
}

export function estimatedOneRepMax(
  weight: number,
  reps: number,
  rpe: number | null,
): number | null {
  if (!(weight > 0) || !Number.isInteger(reps) || reps < 1 || reps > 10) return null
  const effectiveReps = Math.min(10, reps + (rpe === null ? 0 : 10 - rpe))
  const value = effectiveReps === 1 ? weight : weight * (1 + effectiveReps / 30)
  return Math.floor(value * 10 + 0.5) / 10
}

// The best estimate from what has been typed so far; unfinished rows are skipped.
export function bestOneRepMax(sets: SetInput[]): number | null {
  let best: number | null = null
  for (const set of sets) {
    if (set.skipped || set.durationSeconds !== undefined) continue
    if (set.weight === '' || set.reps === '') continue
    const rpe = set.rpe === '' ? null : Number(set.rpe)
    if (rpe !== null && !(rpe >= 1 && rpe <= 10)) continue
    const estimate = estimatedOneRepMax(Number(set.weight), Number(set.reps), rpe)
    if (estimate !== null && (best === null || estimate > best)) best = estimate
  }
  return best
}

// Show a reminder only until today's weight is logged or the user dismisses it.
export function shouldShowWeightReminder(
  weights: { day: string }[],
  currentDay: string,
  dismissed: boolean,
): boolean {
  return !dismissed && !weights.some((entry) => entry.day === currentDay)
}

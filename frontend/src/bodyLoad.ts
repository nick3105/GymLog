// Display helpers for the Body load card (REV-09). The numbers themselves come from the API.

// How long a group's bar is, in percent of the group with the most sets.
export function barPercent(sets: number, mostSets: number): number {
  return mostSets === 0 ? 0 : (sets / mostSets) * 100
}

// "Not trained: Calves, Forearms." — or nothing when every group was trained.
export function notTrainedSentence(groups: { group: string; sets: number }[]): string {
  const untrained = groups.filter((group) => group.sets === 0).map((group) => group.group)
  return untrained.length === 0 ? '' : `Not trained: ${untrained.join(', ')}.`
}

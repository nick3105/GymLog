// Moving a whole item keeps its targets, identity and validation text together.
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items
  const changed = [...items]
  const [item] = changed.splice(from, 1)
  changed.splice(to, 0, item)
  return changed
}

// The dragged card is excluded: each remaining midpoint separates two drop slots.
export function insertionIndex(pointerY: number, midpoints: number[]): number {
  const index = midpoints.findIndex((midpoint) => pointerY < midpoint)
  return index === -1 ? midpoints.length : index
}

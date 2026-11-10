import type { Exercise } from './types'

// Gym shorthand and muscle nicknames: a typed word on the left also matches the phrase on the right.
const ALIASES: Record<string, string> = {
  db: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  rdl: 'romanian deadlift',
  sldl: 'stiff deadlift',
  dl: 'deadlift',
  ohp: 'overhead press',
  bp: 'bench press',
  bss: 'bulgarian split squat',
  abs: 'core',
  pecs: 'chest',
  delts: 'shoulders',
  lats: 'back',
  traps: 'back',
  ups: 'up',
}

// "Curls" and "curl", "Flyes" and "flye" count as the same word; "press" keeps its s.
function stem(word: string): string {
  return word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word
}

function rawWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function words(text: string): string[] {
  return rawWords(text).map(stem)
}

// How many single-letter edits (add, remove, change, swap two neighbours) turn a into b.
function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array<number>(b.length).fill(0),
  ])
  for (let j = 1; j <= b.length; j++) rows[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const change = a[i - 1] === b[j - 1] ? 0 : 1
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + change)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1)
      }
    }
  }
  return rows[a.length][b.length]
}

// How well one typed word matches an exercise: 3 a whole word, 2 the start of a word, 1 inside a
// joined-up name ("pullup" in "Pull-up") or with a typo; 0 no match.
function scoreWord(typed: string, nameWords: string[], groupWords: string[]): number {
  let best = 0
  for (const word of nameWords) {
    if (word === typed) return 3
    if (word.startsWith(typed)) best = Math.max(best, 2)
  }
  if (best > 0) return best
  if (typed.length >= 4 && nameWords.join('').includes(typed)) return 1
  if (groupWords.some((word) => word.startsWith(typed))) return 1
  if (typed.length >= 4) {
    const allowed = typed.length >= 7 ? 2 : 1
    for (const word of nameWords) {
      if (word.length < 3) continue
      if (
        editDistance(typed, word) <= allowed ||
        editDistance(typed, word.slice(0, typed.length)) <= allowed
      ) {
        return 1
      }
    }
  }
  return 0
}

// The exercises that match every typed word, best first; ties keep catalogue order, where the
// common exercises of each group come first. With nothing typed, a chosen group lists all of it.
export function searchExercises(exercises: Exercise[], query: string, group = ''): Exercise[] {
  const inGroup = group ? exercises.filter((exercise) => exercise.group === group) : exercises
  const typed = rawWords(query)
  if (typed.length === 0) return group ? inGroup : []

  const scored: { exercise: Exercise; score: number; index: number }[] = []
  inGroup.forEach((exercise, index) => {
    const nameWords = words(exercise.name)
    const groupWords = words(exercise.group)
    let score = 0
    for (const word of typed) {
      const alternatives = [[stem(word)], ...(ALIASES[word] ? [words(ALIASES[word])] : [])]
      let best = 0
      for (const phrase of alternatives) {
        const scores = phrase.map((part) => scoreWord(part, nameWords, groupWords))
        if (!scores.includes(0))
          best = Math.max(
            best,
            scores.reduce((sum, value) => sum + value),
          )
      }
      if (best === 0) return
      score += best
    }
    // "bench" ranks Bench press above Incline bench press.
    if (nameWords[0]?.startsWith(stem(typed[0]))) score += 2
    // Among equal matches the plain name wins: "Barbell row" before "Barbell Rear Delt Row".
    score -= nameWords.length / 4
    scored.push({ exercise, score, index })
  })
  scored.sort((a, b) => b.score - a.score || a.index - b.index)
  return scored.map((item) => item.exercise)
}

import { Check, Search } from 'lucide-react'
import { useState } from 'react'

import { searchExercises } from '../exerciseSearch'
import type { Exercise } from '../types'
import { input, label } from '../ui'

type Props = {
  exercises: Exercise[]
  plannedIds: string[]
  onAdd: (exercise: Exercise) => void
}

// PLN-02: find an exercise by typing, by tapping a muscle, or both.
export default function ExercisePicker({ exercises, plannedIds, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  // Groups in the order the API sends them — no hard-coded list here.
  const groups = [...new Set(exercises.map((exercise) => exercise.group))]
  const results = searchExercises(exercises, query, group)
  const showing = query.trim() !== '' || group !== ''

  return (
    <div>
      <label htmlFor="exercise-search" className={label}>
        Add an exercise
      </label>
      <div className="relative">
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
          aria-hidden
        />
        <input
          id="exercise-search"
          type="search"
          className={`${input} pl-10`}
          placeholder="Search, e.g. db row"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Muscle">
        {['', ...groups].map((name) => (
          <button
            key={name || 'all'}
            type="button"
            aria-pressed={group === name}
            onClick={() => setGroup(name)}
            className={`min-h-11 rounded-full border px-3 text-sm font-medium ${
              group === name ? 'border-lime text-lime' : 'border-border text-text'
            }`}
          >
            {name || 'All'}
          </button>
        ))}
      </div>
      {showing && (
        <>
          <p className="text-muted mt-3 mb-1 text-sm" aria-live="polite">
            {results.length === 0
              ? `No exercise matches "${query.trim()}".`
              : `${results.length} ${results.length === 1 ? 'exercise' : 'exercises'} — tap to add`}
          </p>
          {results.length > 0 && (
            <ul className="border-border max-h-80 overflow-y-auto rounded-xl border">
              {results.map((exercise) => (
                <li key={exercise.id} className="border-border border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(exercise)
                      setQuery('')
                    }}
                    className="flex min-h-12 w-full items-center justify-between gap-2 px-3 py-2 text-left"
                  >
                    <span className="min-w-0">{exercise.name}</span>
                    <span className="text-muted flex shrink-0 items-center gap-1 text-sm">
                      {plannedIds.includes(exercise.id) && (
                        <Check className="text-lime size-4" aria-label="In this workout" />
                      )}
                      {exercise.group}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

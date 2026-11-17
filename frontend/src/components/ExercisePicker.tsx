import { Check, Search, Star } from 'lucide-react'
import { useState } from 'react'

import { favoriteExercises } from '../exerciseFavorites'
import { searchExercises } from '../exerciseSearch'
import type { Exercise } from '../types'
import PersonalExerciseForm from './PersonalExerciseForm'
import { input, label, secondaryButton } from '../ui'

type Props = {
  exercises: Exercise[]
  plannedIds: string[]
  favoriteExerciseIds?: string[]
  onAdd: (exercise: Exercise) => void
  onCreate?: (exercise: Exercise) => void
}

// PLN-02: find an exercise by typing, by tapping a muscle, or both.
export default function ExercisePicker({
  exercises,
  plannedIds,
  favoriteExerciseIds,
  onAdd,
  onCreate,
}: Props) {
  const [creating, setCreating] = useState(false)
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  // Groups in the order the API sends them — no hard-coded list here.
  const groups = [...new Set(exercises.map((exercise) => exercise.group))]
  const results = searchExercises(exercises, query, group)
  const showing = query.trim() !== '' || group !== ''
  const favorites = favoriteExercises(exercises, favoriteExerciseIds ?? [])

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="exercise-search" className={label}>
          Add an exercise
        </label>
        {favoriteExerciseIds && (
          <button
            type="button"
            onClick={() => setFavoritesOpen(!favoritesOpen)}
            aria-label="Favourite exercises"
            aria-expanded={favoritesOpen}
            className="border-accent/50 bg-accent/10 text-accent focus-visible:outline-accent flex size-11 shrink-0 items-center justify-center rounded-full border focus-visible:outline-2"
          >
            <Star className="size-5" aria-hidden />
          </button>
        )}
      </div>
      {favoritesOpen && (
        <div
          role="region"
          aria-label="Favourite exercises"
          className="border-border bg-panel mt-2 rounded-lg border p-2"
        >
          {favorites.length === 0 ? (
            <p className="text-muted p-2 text-sm">No favourites yet. Add stars in Exercises.</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {favorites.map((exercise) => (
                <li key={exercise.id} className="border-border border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(exercise)
                      setFavoritesOpen(false)
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-2 px-2 py-2 text-left"
                  >
                    <span>{exercise.name}</span>
                    <span className="text-muted text-sm">{exercise.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
            className={`min-h-11 rounded-full border px-3 text-sm font-normal ${
              group === name ? 'border-accent text-accent' : 'border-border text-text'
            }`}
          >
            {name || 'All'}
          </button>
        ))}
      </div>
      {onCreate && !creating && (
        <button
          type="button"
          className={`${secondaryButton} mt-3`}
          onClick={() => setCreating(true)}
        >
          Create personal exercise
        </button>
      )}
      {onCreate && creating && (
        <PersonalExerciseForm
          exercises={exercises}
          initialName={query}
          onCancel={() => setCreating(false)}
          onCreated={(exercise) => {
            onCreate(exercise)
            setQuery('')
            setCreating(false)
          }}
        />
      )}
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
                    <span className="min-w-0">
                      {exercise.name}
                      {exercise.source === 'personal' && (
                        <span className="text-muted block text-sm">
                          Personal — excluded from volume estimates
                        </span>
                      )}
                    </span>
                    <span className="text-muted flex shrink-0 items-center gap-1 text-sm">
                      {plannedIds.includes(exercise.id) && (
                        <Check className="text-accent size-4" aria-label="In this workout" />
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

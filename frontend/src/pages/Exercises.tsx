import { ChevronRight, Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { groupExercises } from '../exerciseLibrary'
import { searchExercises } from '../exerciseSearch'
import { useJournal } from '../journal'
import { input } from '../ui'

// NAV-04: every exercise, searchable and by muscle. A tap opens its guide and progress.
export default function Exercises() {
  const { journal } = useJournal()
  const [, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  // Groups in the order the API sends them — no hard-coded list here.
  const groups = [...new Set(journal.exercises.map((exercise) => exercise.group))]
  const filtering = query.trim() !== '' || group !== ''
  const results = filtering ? searchExercises(journal.exercises, query, group) : journal.exercises
  // Search results are ranked best first, so they stay one list; otherwise one list per muscle.
  const blocks = filtering ? [{ group: '', exercises: results }] : groupExercises(results)

  function open(exerciseId: string) {
    // The sheet is a URL parameter, so the phone's back gesture closes it (as ExerciseLink does).
    setSearchParams({ exercise: exerciseId }, { preventScrollReset: true })
  }

  return (
    <>
      <h1 className="gradient-text mb-4 text-3xl font-bold">Exercises</h1>
      <label htmlFor="library-search" className="sr-only">
        Search exercises
      </label>
      <div className="relative">
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
          aria-hidden
        />
        <input
          id="library-search"
          type="search"
          className={`${input} pl-10`}
          placeholder="Search, e.g. rdl"
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
      <p className="text-muted mt-4 mb-2 text-sm" aria-live="polite">
        {results.length === 0
          ? `No exercise matches "${query.trim()}".`
          : `${results.length} ${results.length === 1 ? 'exercise' : 'exercises'}`}
      </p>
      <div className="flex flex-col gap-4">
        {results.length > 0 &&
          blocks.map((block) => (
            <section key={block.group || 'results'} aria-label={block.group || 'Results'}>
              {block.group && (
                <h2 className="text-label mb-1 text-xs font-normal tracking-widest uppercase">
                  {block.group}
                </h2>
              )}
              <ul className="bg-panel rounded-lg">
                {block.exercises.map((exercise) => (
                  <li key={exercise.id} className="border-border border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => open(exercise.id)}
                      className="flex min-h-12 w-full items-center justify-between gap-2 px-4 py-2 text-left"
                    >
                      <span className="min-w-0">{exercise.name}</span>
                      <span className="text-muted flex shrink-0 items-center gap-1 text-sm">
                        {exercise.group}
                        <ChevronRight className="size-4" aria-hidden />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </>
  )
}

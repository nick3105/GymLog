import { ChevronRight, LayoutGrid, List, Rows2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { filterExerciseLibrary } from '../equipment'
import type { Equipment } from '../types'

import { groupExercises } from '../exerciseLibrary'
import { useJournal } from '../journal'
import { input } from '../ui'
import ExerciseCard from '../components/ExerciseCard'
import EquipmentFilter from '../components/EquipmentFilter'

// NAV-04: every exercise, searchable and by muscle. A tap opens its guide and progress.
export default function Exercises() {
  const { journal } = useJournal()
  const [, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [equipment, setEquipment] = useState<Equipment | ''>('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [phoneControls, setPhoneControls] = useState(
    () => window.matchMedia('(max-width: 639px), (pointer: coarse)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px), (pointer: coarse)')
    const update = () => {
      setPhoneControls(media.matches)
      setPlayingId(null)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const [layout, setLayout] = useState<'list' | 'cards' | 'grid'>('list')
  // Groups in the order the API sends them — no hard-coded list here.
  const groups = [...new Set(journal.exercises.map((exercise) => exercise.group))]
  const filtering = query.trim() !== '' || group !== '' || equipment !== ''
  const results = filterExerciseLibrary(journal.exercises, query, group, equipment)
  // Search results are ranked best first, so they stay one list; otherwise one list per muscle.
  const blocks = filtering ? [{ group: '', exercises: results }] : groupExercises(results)

  function open(exerciseId: string) {
    setPlayingId(null)
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
      <EquipmentFilter
        value={equipment}
        onChange={(value) => {
          setEquipment(value)
          setPlayingId(null)
        }}
      />
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
      <div className="mt-4 mb-3 flex gap-2" role="group" aria-label="Exercise layout">
        {(
          [
            { value: 'list', title: 'List', Icon: List },
            { value: 'cards', title: 'Cards', Icon: Rows2 },
            { value: 'grid', title: 'Grid', Icon: LayoutGrid },
          ] as const
        ).map(({ value, title, Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={layout === value}
            onClick={() => {
              setPlayingId(null)
              setLayout(value)
            }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-base ${layout === value ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted'}`}
          >
            <Icon className="size-5" aria-hidden />
            {title}
          </button>
        ))}
      </div>
      <p className="text-muted mt-4 mb-2 text-sm" aria-live="polite">
        {results.length === 0
          ? query.trim()
            ? `No exercise matches "${query.trim()}" with these filters.`
            : 'No exercises match these filters.'
          : `${results.length} ${results.length === 1 ? 'exercise' : 'exercises'}`}
      </p>
      <div className="flex flex-col gap-4">
        {results.length > 0 &&
          blocks.map((block) => (
            <section key={block.group || 'results'} aria-label={block.group || 'Results'}>
              {block.group && (
                <h2 className="text-label mb-3 text-base font-normal tracking-widest uppercase">
                  {block.group}
                </h2>
              )}
              <ul
                className={`grid items-stretch ${layout === 'grid' ? 'grid-cols-2 gap-3' : layout === 'list' ? 'grid-cols-1 gap-2' : 'grid-cols-1 gap-6'}`}
              >
                {block.exercises.map((exercise) => (
                  <li key={exercise.id} className="min-w-0">
                    {layout === 'list' ? (
                      <button
                        type="button"
                        onClick={() => open(exercise.id)}
                        className="bg-panel focus-visible:outline-accent flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left focus-visible:outline-2"
                      >
                        <span className="min-w-0">
                          <span className="text-text block text-base font-normal break-words">
                            {exercise.name}
                          </span>
                          <span className="text-accent block text-sm">{exercise.group}</span>
                        </span>
                        <ChevronRight className="text-muted size-5 shrink-0" aria-hidden />
                      </button>
                    ) : (
                      <ExerciseCard
                        exercise={exercise}
                        compact={layout === 'grid'}
                        phoneControls={phoneControls}
                        playing={playingId === exercise.id}
                        onTogglePlay={() =>
                          setPlayingId((current) => (current === exercise.id ? null : exercise.id))
                        }
                        onOpen={() => open(exercise.id)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </>
  )
}

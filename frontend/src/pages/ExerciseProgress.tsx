import { ArrowLeft } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import ExerciseLink from '../components/ExerciseLink'
import { exerciseHistory } from '../exerciseHistory'
import { formatDay } from '../format'
import { useJournal } from '../journal'
import { card, input, label } from '../ui'

export default function ExerciseProgress() {
  const { journal } = useJournal()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const history = exerciseHistory(journal.sessions)
  const exercises = exerciseHistory(journal.sessions, search)

  function changeSearch(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('q', value)
    else next.delete('q')
    setSearchParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <>
      <Link
        to="/review"
        className="text-accent mb-2 inline-flex min-h-11 items-center gap-2 font-normal"
      >
        <ArrowLeft className="size-5" aria-hidden />
        Review and Create
      </Link>
      <h1 className="gradient-text mb-4 text-3xl font-bold">Exercise Progress</h1>
      <label className={label} htmlFor="exercise-search">
        Search exercises
      </label>
      <input
        id="exercise-search"
        type="search"
        className={`${input} mb-4`}
        placeholder="Search by exercise name"
        value={search}
        onChange={(event) => changeSearch(event.target.value)}
      />
      {history.length === 0 ? (
        <p className="text-muted">Finish a workout to see your exercise progress here.</p>
      ) : exercises.length === 0 ? (
        <p className="text-muted">No exercises match your search.</p>
      ) : (
        <>
          <p className="text-muted mb-3 text-sm">Most recently performed first</p>
          <ul className="flex flex-col gap-3">
            {exercises.map((exercise) => (
              <li key={exercise.id} className={`${card} min-w-0`}>
                <ExerciseLink
                  id={exercise.id}
                  name={exercise.name}
                  measurement={exercise.measurement}
                />
                <p className="text-muted text-sm">Last performed · {formatDay(exercise.day)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

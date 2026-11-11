import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import EmptyState from '../components/EmptyState'
import ExerciseLink from '../components/ExerciseLink'
import Notice from '../components/Notice'
import { formatDay, formatNumber } from '../format'
import { useJournal } from '../journal'
import { card } from '../ui'

// REV-02: what was actually lifted in one session.
export default function ReviewDetail() {
  const { id } = useParams()
  const { journal } = useJournal()
  const session = journal.sessions.find((item) => item.id === id)

  if (!session) {
    return (
      <EmptyState
        title="Session not found."
        text="Reload your journal with the button at the top, or pick another session."
        to="/review"
        action="All sessions"
      />
    )
  }

  return (
    <>
      <Notice />
      <Link
        to="/review"
        className="text-accent mb-2 inline-flex min-h-11 items-center gap-2 font-normal"
      >
        <ArrowLeft className="size-5" aria-hidden />
        All sessions
      </Link>
      <h1 className="gradient-text text-3xl font-extralight">{session.name}</h1>
      <p className="text-muted mb-4">{formatDay(session.day)}</p>
      <div className="flex flex-col gap-4">
        {session.exercises.map((exercise) => (
          <section key={exercise.id} className={card}>
            <div className="flex items-start justify-between gap-3">
              <ExerciseLink id={exercise.id} name={exercise.name} />
              <p className="shrink-0 text-right">
                <span className="text-muted block text-xs">Est. 1RM</span>
                <span className="text-accent font-light">
                  {exercise.estimated1rm === null
                    ? '–'
                    : `${formatNumber(exercise.estimated1rm)} kg`}
                </span>
              </p>
            </div>
            <ol className="mt-2 flex flex-col gap-1">
              {exercise.sets.map((set, index) => (
                <li
                  key={index}
                  className="border-border grid grid-cols-[3.5rem_1fr_auto] gap-2 border-t pt-1"
                >
                  <span className="text-muted">Set {index + 1}</span>
                  <span className="font-normal">
                    {formatNumber(set.weight)} kg × {set.reps}
                  </span>
                  <span className="text-muted">
                    RPE {set.rpe === null ? '–' : formatNumber(set.rpe)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  )
}

import { personalVolumeDescription } from '../personalVolume'
import { ArrowLeft, Link2 } from 'lucide-react'
import { Link, useParams } from 'react-router'

import EmptyState from '../components/EmptyState'
import ExerciseLink from '../components/ExerciseLink'
import WorkoutReminder from '../components/WorkoutReminder'
import { supersetLabel } from '../supersets'
import Notice from '../components/Notice'
import { formatDay, formatNumber } from '../format'
import { useJournal } from '../journal'
import { card, secondaryButton } from '../ui'

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
      <h1 className="gradient-text text-3xl font-bold">{session.name}</h1>
      <p className="text-muted mb-4">{formatDay(session.day)}</p>
      <Link to={`/review/${session.id}/edit`} className={`${secondaryButton} mb-4`}>
        Edit workout
      </Link>
      {session.note && (
        <div className={`${card} mb-4`}>
          <h2 className="font-normal">Workout note</h2>
          <p className="mt-2 break-words whitespace-pre-wrap">{session.note}</p>
        </div>
      )}
      <div className="mb-4">
        <WorkoutReminder title="Warmup" text={session.warmup} done={session.warmupDone} />
      </div>
      <div className="flex flex-col gap-4">
        {session.exercises.map((exercise, exerciseIndex) => (
          <section
            key={exercise.id}
            className={`${card} ${exercise.supersetId ? 'border-accent border-l-2' : ''} ${exercise.supersetId && session.exercises[exerciseIndex - 1]?.supersetId === exercise.supersetId ? '-mt-4 rounded-t-none border-t' : ''}`}
          >
            {exercise.supersetId && (
              <p className="text-accent mb-2 flex items-center gap-2">
                <Link2 className="size-5" aria-hidden />
                {supersetLabel(session.exercises, exerciseIndex)}
              </p>
            )}
            <div className="flex items-start justify-between gap-3">
              <ExerciseLink id={exercise.id} name={exercise.name} />
              {exercise.measurement !== 'duration' && (
                <p className="shrink-0 text-right">
                  <span className="text-muted block text-xs">Est. 1RM</span>
                  <span className="text-accent font-light">
                    {exercise.estimated1rm === null
                      ? '–'
                      : `${formatNumber(exercise.estimated1rm)} kg`}
                  </span>
                </p>
              )}
            </div>
            {exercise.note && (
              <p className="mt-3 break-words whitespace-pre-wrap">{exercise.note}</p>
            )}
            {exercise.source === 'personal' && (
              <p className="text-muted mt-2">{personalVolumeDescription(exercise)}</p>
            )}
            <ol className="mt-2 flex flex-col gap-1">
              {exercise.sets.map((set, index) => (
                <li
                  key={index}
                  className="border-border grid grid-cols-[3.5rem_1fr_auto] gap-2 border-t pt-1"
                >
                  <span className="text-muted">
                    Set {index + 1}
                    {index >= (exercise.plannedSets ?? exercise.sets.length) && (
                      <span className="block text-xs">Extra</span>
                    )}
                  </span>
                  <span className="font-normal">
                    {set.skipped ? (
                      'Skipped'
                    ) : (
                      <>
                        {set.durationSeconds !== undefined
                          ? `${set.durationSeconds} s`
                          : `${formatNumber(set.weight)} kg × ${set.reps}`}
                      </>
                    )}
                  </span>
                  <span className="text-muted">
                    {!set.skipped && <>RPE {set.rpe === null ? '–' : formatNumber(set.rpe)}</>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <div className="mt-4">
        <WorkoutReminder title="Cooldown" text={session.cooldown} done={session.cooldownDone} />
      </div>
    </>
  )
}

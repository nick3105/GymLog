import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { api } from '../api'
import type { CoacheeJournal, CoachingState } from '../coaching'
import { formatDay, formatSet } from '../format'
import { card, errorText, secondaryButton } from '../ui'

export default function CoacheeDetail() {
  const { coacheeId } = useParams()
  const [, setSearchParams] = useSearchParams()
  const [loadedJournal, setJournal] = useState<CoacheeJournal | null>(null)
  const [actorId, setActorId] = useState<number | null>(null)
  const [problem, setProblem] = useState('')
  const journal = loadedJournal?.owner.id === Number(coacheeId) ? loadedJournal : null
  useEffect(() => {
    let current = true
    Promise.all([api<CoacheeJournal>(`coachees/${coacheeId}`), api<CoachingState>('coaching')])
      .then(([result, actor]) => {
        if (current) {
          setJournal(result)
          setProblem('')
          setActorId(actor.userId)
        }
      })
      .catch((error: Error) => {
        if (current) {
          setJournal(null)
          setProblem(error.message)
        }
      })
    return () => {
      current = false
    }
  }, [coacheeId])

  useEffect(() => {
    function unavailable() {
      setJournal(null)
      setProblem('This coachee is no longer available. Check your relationships.')
    }
    window.addEventListener('gymlog-coachee-unavailable', unavailable)
    return () => window.removeEventListener('gymlog-coachee-unavailable', unavailable)
  }, [])

  function openExercise(id: string, name: string, measurement?: string) {
    setSearchParams({
      exercise: id,
      exerciseName: name,
      ...(measurement === 'duration' ? { measurement: 'duration' } : {}),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/coachees" className={secondaryButton}>
        All coachees
      </Link>
      <h1 className="gradient-text text-3xl font-bold break-words">
        {journal ? `Coaching ${journal.owner.username}` : 'Coaching workspace'}
      </h1>
      {problem && (
        <p role="alert" className={errorText}>
          {problem}
        </p>
      )}
      {!journal && !problem && <p>Loading training journal…</p>}
      {journal && (
        <>
          <Link to={`/coachees/${coacheeId}/create`} className={secondaryButton}>
            Create workout for {journal.owner.username}
          </Link>
          <h2 className="text-xl font-normal">Saved workout plans</h2>
          {journal.templates.length === 0 && <p className="text-muted">No saved plans yet.</p>}
          {journal.templates.map((template) => (
            <section key={template.id} className={card}>
              <h3 className="mb-2 text-lg font-normal break-words">{template.name}</h3>
              <p className="text-muted mb-2">
                Created by {template.createdBy?.username ?? journal.owner.username}
              </p>
              {(template as { note?: string }).note && (
                <p className="mb-3 break-words whitespace-pre-wrap">
                  {(template as { note?: string }).note}
                </p>
              )}
              <ul className="mb-3 flex flex-col gap-2">
                {template.exercises.map((exercise) => (
                  <li key={exercise.id}>
                    <button
                      className="text-accent min-h-11 text-left font-normal"
                      onClick={() => openExercise(exercise.id, exercise.name, exercise.measurement)}
                    >
                      {exercise.name} · {exercise.sets} sets
                    </button>
                    {(exercise as { note?: string }).note && (
                      <p className="break-words whitespace-pre-wrap">
                        {(exercise as { note?: string }).note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {template.createdBy?.id === actorId && (
                <Link
                  to={`/coachees/${coacheeId}/workouts/${template.id}/edit`}
                  className={secondaryButton}
                >
                  Edit your plan
                </Link>
              )}
            </section>
          ))}
          <h2 className="text-xl font-normal">Completed training</h2>
          {journal.sessions.length === 0 && (
            <p className="text-muted">No completed training yet.</p>
          )}
          {journal.sessions.map((session) => (
            <details key={session.id} className={card}>
              <summary className="min-h-11 cursor-pointer font-normal break-words">
                {formatDay(session.day)} · {session.name}
              </summary>
              {(session as { note?: string }).note && (
                <p className="my-3 break-words whitespace-pre-wrap">
                  {(session as { note?: string }).note}
                </p>
              )}
              {session.exercises.map((exercise) => (
                <section key={exercise.id} className="border-border border-t py-3">
                  <button
                    className="text-accent min-h-11 text-left font-normal"
                    onClick={() => openExercise(exercise.id, exercise.name, exercise.measurement)}
                  >
                    {exercise.name}
                  </button>
                  {(exercise as { note?: string }).note && (
                    <p className="mb-2 break-words whitespace-pre-wrap">
                      {(exercise as { note?: string }).note}
                    </p>
                  )}
                  <ol>
                    {exercise.sets.map((set, index) => (
                      <li key={index} className="py-1">
                        Set {index + 1} · {formatSet(set)}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </details>
          ))}
        </>
      )}
    </div>
  )
}

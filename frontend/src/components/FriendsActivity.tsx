import { X } from 'lucide-react'
import WorkoutComments from './WorkoutComments'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { api } from '../api'
import { formatDay, formatNumber } from '../format'
import type { SharedWorkout, SharedWorkoutSummary } from '../friends'
import { card, errorText, textButton } from '../ui'

export default function FriendsActivity({
  activity,
  selectedId,
}: {
  activity: SharedWorkoutSummary[]
  selectedId: string | null
}) {
  const { hash } = useLocation()
  const feed = useRef<HTMLElement>(null)

  useEffect(() => {
    if (hash === '#friends-activity') feed.current?.scrollIntoView()
  }, [hash])

  const [detail, setDetail] = useState<SharedWorkout | null>(null)
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null)

  useEffect(() => {
    if (!selectedId) return
    let active = true
    api<SharedWorkout>(`shared-workouts/${encodeURIComponent(selectedId)}`)
      .then((workout) => {
        if (active) {
          setFailure(null)
          setDetail(workout)
        }
      })
      .catch((error: Error) => {
        if (active) {
          setDetail(null)
          setFailure({ id: selectedId, message: error.message })
        }
      })
    return () => {
      active = false
    }
  }, [selectedId])

  // Link navigation remounts this view when the selected share changes.
  if (selectedId) {
    return (
      <section className={card}>
        <div className="bg-panel border-border sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 mb-2 flex justify-end border-b">
          <Link
            to="/friends"
            aria-label="Close shared workout"
            className={`${textButton} min-w-11 justify-center`}
          >
            <X className="size-5" aria-hidden />
          </Link>
        </div>
        {failure?.id === selectedId ? (
          <p role="alert" className={errorText}>
            {failure.message}
          </p>
        ) : detail?.id === selectedId ? (
          <>
            <h2 className="text-xl font-normal wrap-break-word">{detail.name}</h2>
            <p className="text-muted wrap-break-word">
              Shared by {detail.sender} · {formatDay(detail.day)}
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {detail.exercises.map((exercise, index) => (
                <li key={index}>
                  <h3 className="font-normal wrap-break-word">{exercise.name}</h3>
                  {exercise.sets.length === 0 && <p>No completed sets.</p>}
                  <ol className="text-muted">
                    {exercise.sets.map((set, setIndex) => (
                      <li key={setIndex}>
                        Set {setIndex + 1}:{' '}
                        {set.durationSeconds !== undefined
                          ? `${set.durationSeconds} s`
                          : `${formatNumber(set.weight ?? 0)} kg × ${set.reps}`}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
            <WorkoutComments
              key={detail.id}
              path={`shared-workouts/${encodeURIComponent(detail.id)}/comments`}
            />
          </>
        ) : (
          <p role="status">Loading shared workout…</p>
        )}
      </section>
    )
  }

  return (
    <section ref={feed} id="friends-activity" className={`${card} scroll-mt-16`}>
      <h2 className="mb-2 text-xl font-normal">Friends activity</h2>
      {activity.length === 0 && <p className="text-muted">No workouts shared with you yet.</p>}
      <ul className="divide-border divide-y">
        {activity.map((workout) => (
          <li key={workout.id}>
            <Link
              to={`/friends?sharedWorkout=${encodeURIComponent(workout.id)}`}
              className="flex min-h-11 flex-col justify-center py-2 wrap-break-word"
            >
              <span className="text-accent font-normal">{workout.name}</span>
              <span className="text-muted">
                {workout.sender} · {formatDay(workout.day)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

import { Link } from 'react-router'

import { targetsFor } from '../targets'
import type { ScheduledWorkout } from '../schedule'
import { card, secondaryButton } from '../ui'

export default function ScheduledWorkoutCard({
  entry,
  details = false,
}: {
  entry: ScheduledWorkout
  details?: boolean
}) {
  return (
    <article className={card}>
      {entry.seriesName && (
        <p className="text-accent mb-1 break-words">
          {entry.seriesName} · Day {entry.position}
        </p>
      )}
      <h3 className="text-xl font-normal break-words">{entry.workout.name}</h3>
      {entry.sessionId ? (
        <p className="text-accent mt-1">Completed</p>
      ) : (
        entry.inProgress && <p className="text-accent mt-1">In progress</p>
      )}
      <ul className="mt-2 space-y-2">
        {entry.workout.exercises.map((exercise) => (
          <li key={exercise.id} className="break-words">
            <p>{exercise.name}</p>
            <p className="text-muted">
              {targetsFor(exercise)
                .map((target) =>
                  target.durationSeconds !== undefined
                    ? `${target.durationSeconds}s`
                    : `${target.reps} reps${target.weight === null ? '' : ` at ${target.weight} kg`}`,
                )
                .join(' · ')}
            </p>
          </li>
        ))}
      </ul>
      {!details && (
        <Link
          to={`/schedule/${entry.id}?week=${entry.week}`}
          className={`${secondaryButton} mt-3 w-full`}
        >
          Open scheduled workout
        </Link>
      )}
    </article>
  )
}

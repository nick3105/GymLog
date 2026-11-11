import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

import EmptyState from '../components/EmptyState'
import { formatDay } from '../format'
import { useJournal } from '../journal'
import type { Session } from '../types'

// Newest training day first; two sessions on one day by the time they were saved.
function newestFirst(sessions: Session[]): Session[] {
  return [...sessions].sort(
    (a, b) => b.day.localeCompare(a.day) || b.completedAt.localeCompare(a.completedAt),
  )
}

// REV-01: every completed session.
export default function Review() {
  const { journal } = useJournal()

  return (
    <>
      <h1 className="gradient-text mb-4 text-3xl font-bold">Review workouts</h1>
      {journal.sessions.length === 0 ? (
        <EmptyState
          title="Your first session is waiting."
          text="Finish a workout and your sets, reps and effort appear here."
          to="/start"
          action="Start workout"
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {newestFirst(journal.sessions).map((session) => (
            <li key={session.id}>
              <Link
                to={`/review/${session.id}`}
                className="bg-panel flex min-h-16 items-center gap-3 rounded-lg p-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-muted block text-sm">{formatDay(session.day)}</span>
                  <span className="block truncate text-lg font-normal">{session.name}</span>
                  <span className="text-muted block text-sm">
                    {session.exercises.length} exercises ·{' '}
                    {session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)}{' '}
                    sets
                  </span>
                </span>
                <ChevronRight className="text-muted size-5 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

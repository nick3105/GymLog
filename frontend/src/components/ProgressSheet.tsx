import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { api } from '../api'
import { formatDay, formatNumber, formatSet } from '../format'
import { useJournal } from '../journal'
import type { ExerciseStats } from '../types'
import { card } from '../ui'
import LineChart from './LineChart'

// Full-screen exercise progress (REV-03 to REV-06), drawn over whatever page opened it.
export default function ProgressSheet({ exerciseId }: { exerciseId: string }) {
  const { journal } = useJournal()
  const navigate = useNavigate()
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const [stats, setStats] = useState<ExerciseStats | null>(null)
  const [problem, setProblem] = useState('')
  const name = journal.exercises.find((exercise) => exercise.id === exerciseId)?.name ?? 'Exercise'

  useEffect(() => {
    let current = true
    api<ExerciseStats>(`exercises/${encodeURIComponent(exerciseId)}/stats`)
      .then((result) => current && setStats(result))
      .catch((error: Error) => current && setProblem(error.message))
    return () => {
      current = false
    }
  }, [exerciseId, journal.sessions])

  function close() {
    // Opened from inside the app: go back, exactly like the phone's back gesture.
    // Opened from a link or a reload: there is nothing to go back to, so just remove the sheet.
    if (location.key !== 'default') navigate(-1)
    else
      setSearchParams(
        (params) => {
          params.delete('exercise')
          return params
        },
        { replace: true },
      )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-title"
      className="bg-ink fixed inset-0 z-40 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
        <button
          type="button"
          onClick={close}
          className="text-accent inline-flex min-h-11 w-fit items-center gap-2 font-semibold"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Back
        </button>
        <div>
          <p className="text-muted text-xs font-semibold tracking-widest uppercase">
            Exercise progress
          </p>
          <h2 id="progress-title" className="text-2xl font-bold">
            {name}
          </h2>
        </div>
        {problem && <p className="text-danger text-sm font-medium">{problem}</p>}
        {!stats && !problem && <p className="text-muted">Loading…</p>}
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className={card}>
                <p className="text-muted text-sm">Best estimated 1RM</p>
                <p className="font-mono text-2xl">
                  {stats.best === null ? '–' : `${formatNumber(stats.best)} kg`}
                </p>
              </div>
              <div className={card}>
                <p className="text-muted text-sm">Latest estimated 1RM</p>
                <p className="font-mono text-2xl">
                  {stats.latest === null ? '–' : `${formatNumber(stats.latest)} kg`}
                </p>
              </div>
            </div>
            <div className={card}>
              <LineChart
                title={`${name}: estimated 1RM`}
                points={stats.points.map((point) => ({ day: point.day, value: point.estimate }))}
                unit="kg"
                emptyMessage="No estimates yet."
              />
            </div>
            {stats.last && (
              <p className="text-muted text-sm">
                Last time · {formatDay(stats.last.day)}: {stats.last.sets.map(formatSet).join(', ')}
              </p>
            )}
            <p className="text-muted text-sm">
              Estimates use sets of 1–10 reps with weight. With RPE, the reps you had left (10 −
              RPE) are added, up to 10. It is an estimate, not a tested maximum.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { api } from '../api'
import { formatDay, formatNumber, formatSet } from '../format'
import { useJournal } from '../journal'
import type { ExerciseStats } from '../types'
import { card, secondaryButton } from '../ui'
import LineChart from './LineChart'

// Full-screen exercise progress (REV-03 to REV-06), drawn over whatever page opened it.
export default function ProgressSheet({ exerciseId }: { exerciseId: string }) {
  const { journal } = useJournal()
  const navigate = useNavigate()
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const [stats, setStats] = useState<ExerciseStats | null>(null)
  const [metric, setMetric] = useState<'estimated1rm' | 'averageWeight'>('estimated1rm')
  const [problem, setProblem] = useState('')
  const exercise = journal.exercises.find((item) => item.id === exerciseId)
  const name = exercise?.name ?? 'Exercise'
  const timed = exercise?.measurement === 'duration'

  useEffect(() => {
    let current = true
    api<ExerciseStats>(`exercises/${encodeURIComponent(exerciseId)}/stats?include=average-weight`)
      .then((result) => current && setStats(result))
      .catch((error: Error) => current && setProblem(error.message))
    return () => {
      current = false
    }
  }, [exerciseId, journal.sessions])

  const average = metric === 'averageWeight'
  const metricLabel = average ? 'average weight' : 'estimated 1RM'
  const best = average ? stats?.averageWeight?.best : stats?.best
  const latest = average ? stats?.averageWeight?.latest : stats?.latest
  const points = average
    ? (stats?.averageWeight?.points ?? []).map((point) => ({ day: point.day, value: point.weight }))
    : (stats?.points ?? []).map((point) => ({ day: point.day, value: point.estimate }))

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
          className="text-accent inline-flex min-h-11 w-fit items-center gap-2 font-normal"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Back
        </button>
        <div>
          <p className="text-label text-xs font-normal tracking-widest uppercase">
            Exercise progress
          </p>
          <h2 id="progress-title" className="text-2xl font-light">
            {name}
          </h2>
        </div>
        {problem && <p className="text-danger text-sm font-normal">{problem}</p>}
        {!stats && !problem && <p className="text-muted">Loading…</p>}
        {stats && (
          <>
            {!timed && (
              <>
                <div role="group" aria-label="Chart metric" className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={!average}
                    onClick={() => setMetric('estimated1rm')}
                    className={`${secondaryButton} aria-pressed:bg-accent/20 aria-pressed:ring-accent aria-pressed:ring-2`}
                  >
                    Estimated 1RM
                  </button>
                  <button
                    type="button"
                    aria-pressed={average}
                    onClick={() => setMetric('averageWeight')}
                    className={`${secondaryButton} aria-pressed:bg-accent/20 aria-pressed:ring-accent aria-pressed:ring-2`}
                  >
                    Average weight
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={card}>
                    <p className="text-muted text-sm">Best {metricLabel}</p>
                    <p className="font-mono text-2xl">
                      {best == null ? '–' : `${formatNumber(best)} kg`}
                    </p>
                  </div>
                  <div className={card}>
                    <p className="text-muted text-sm">Latest {metricLabel}</p>
                    <p className="font-mono text-2xl">
                      {latest == null ? '–' : `${formatNumber(latest)} kg`}
                    </p>
                  </div>
                </div>
                <div className={card}>
                  <LineChart
                    title={`${name}: ${metricLabel}`}
                    points={points}
                    unit="kg"
                    emptyMessage={average ? 'No recorded weights yet.' : 'No estimates yet.'}
                  />
                </div>
              </>
            )}
            {stats.last && (
              <p className="text-muted text-sm">
                Last time · {formatDay(stats.last.day)}: {stats.last.sets.map(formatSet).join(', ')}
              </p>
            )}
            {timed ? (
              <p className="text-muted text-sm">Holds are recorded in seconds.</p>
            ) : average ? (
              <p className="text-muted text-sm">
                Each point is the average external weight per performed set in one workout. Zero-kg
                sets count; skipped sets and timed holds are excluded.
              </p>
            ) : (
              <p className="text-muted text-sm">
                Estimates use sets of 1–10 reps with weight. With RPE, the reps you had left (10 −
                RPE) are added, up to 10. It is an estimate, not a tested maximum.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

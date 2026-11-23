import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { api } from '../api'
import Notice from '../components/Notice'
import ScheduleProblem from '../components/ScheduleProblem'
import { today } from '../format'
import { scheduleActionBar, type ScheduleState, type WorkoutSeries as Series } from '../schedule'
import { card, primaryButton, secondaryButton } from '../ui'
import { useSchedule } from '../useSchedule'

export default function WorkoutSeries() {
  const [params] = useSearchParams()
  const week = params.get('week') ?? today()
  const { state, setState, problem, reload } = useSchedule(week)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const weekQuery = '?week=' + week

  async function remove(series: Series) {
    if (
      !state ||
      busy ||
      !window.confirm('Remove "' + series.name + '"? Already scheduled workouts will stay.')
    )
      return
    setBusy(true)
    setError('')
    try {
      setState(
        await api<ScheduleState>('schedule', {
          action: 'deleteSeries',
          id: series.id,
          revision: state.revision,
        }),
      )
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Notice />
      <h1 className="gradient-text mb-4 text-3xl font-bold">Workout series</h1>
      <ScheduleProblem
        message={problem || error}
        retry={() => {
          setError('')
          reload()
        }}
      />
      {!state && !problem && <p role="status">Loading series…</p>}
      {state && !state.series.length && (
        <p className="text-muted">
          Create a series to reuse the same ordered workouts across weeks.
        </p>
      )}
      <ul className="space-y-3">
        {state?.series.map((series) => (
          <li key={series.id} className={card}>
            <h2 className="text-xl font-normal break-words">{series.name}</h2>
            <ol className="my-3 space-y-1">
              {series.workouts.map((workout, index) => (
                <li key={index} className="break-words">
                  Day {index + 1} · {workout.name}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Link
                to={'/schedule/add' + weekQuery + '&series=' + series.id}
                className={secondaryButton}
              >
                Assign to week
              </Link>
              <Link to={'/schedule/series/' + series.id + weekQuery} className={secondaryButton}>
                Edit
              </Link>
              <button
                type="button"
                className={secondaryButton}
                disabled={busy}
                onClick={() => remove(series)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {state && (
        <div className={scheduleActionBar}>
          <Link to={'/schedule/series/new' + weekQuery} className={primaryButton + ' w-full'}>
            Create a series
          </Link>
        </div>
      )}
      <Link to={'/schedule' + weekQuery} className={secondaryButton + ' mt-4 w-full'}>
        Back to schedule
      </Link>
    </>
  )
}

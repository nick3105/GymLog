import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { api } from '../api'
import { useJournal } from '../journal'
import { newId } from '../newId'
import { moveItem } from '../reorder'
import { scheduleActionBar, type WorkoutSeries } from '../schedule'
import { card, input, primaryButton, secondaryButton } from '../ui'
import { readSchedule } from '../useSchedule'
import { useScheduleForm } from '../useScheduleForm'
import ScheduleProblem from './ScheduleProblem'

export default function SeriesForm({
  week,
  revision,
  original,
}: {
  week: string
  revision: number
  original?: WorkoutSeries
}) {
  const { journal } = useJournal()
  const [id] = useState(() => original?.id ?? newId())
  const [currentRevision, setRevision] = useState(revision)
  const [name, setName] = useState(original?.name ?? '')
  const [workouts, setWorkouts] = useState(original?.workouts.map((item) => item.id) ?? [])
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')
  const [dirty, setDirty] = useState(false)
  const markSaved = useScheduleForm(dirty)
  const navigate = useNavigate()
  const returnPath = '/schedule/series?week=' + week
  const available = new Map(journal.templates.map((item) => [item.id, item]))
  for (const item of original?.workouts ?? []) available.set(item.id, item)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || !workouts.length) return
    setBusy(true)
    setProblem('')
    try {
      await api('schedule', {
        action: 'saveSeries',
        id,
        revision: currentRevision,
        name,
        templateIds: workouts,
      })
      markSaved()
      navigate(returnPath, { state: { notice: 'Workout series saved.' } })
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function reload() {
    setBusy(true)
    try {
      const latest = await readSchedule(week)
      if (original && !latest.series.some((item) => item.id === id)) {
        setProblem('This series was removed on another device.')
        return
      }
      setRevision(latest.revision)
      setProblem('')
      setNotice('Schedule reloaded. Review your choices and save again.')
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function updateOrder(order: string[]) {
    setWorkouts(order)
    setDirty(true)
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <label className="block">
        Series name
        <input
          className={input + ' mt-1'}
          required
          maxLength={60}
          value={name}
          disabled={busy}
          onChange={(event) => {
            setName(event.target.value)
            setDirty(true)
          }}
        />
      </label>
      <ol className="space-y-2">
        {workouts.map((workoutId, index) => (
          <li key={index} className={card}>
            <p className="mb-2 break-words">
              Day {index + 1} · {available.get(workoutId)?.name}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryButton}
                aria-label={'Move Day ' + (index + 1) + ' up'}
                disabled={busy || index === 0}
                onClick={() => updateOrder(moveItem(workouts, index, index - 1))}
              >
                Up
              </button>
              <button
                type="button"
                className={secondaryButton}
                aria-label={'Move Day ' + (index + 1) + ' down'}
                disabled={busy || index === workouts.length - 1}
                onClick={() => updateOrder(moveItem(workouts, index, index + 1))}
              >
                Down
              </button>
              <button
                type="button"
                className={secondaryButton}
                aria-label={'Remove Day ' + (index + 1)}
                disabled={busy}
                onClick={() => updateOrder(workouts.filter((_, at) => at !== index))}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>
      <label className="block">
        Add a saved workout
        <select
          className={input + ' mt-1'}
          value={selected}
          disabled={busy || workouts.length >= 7}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">Choose…</option>
          {[...available.values()].map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={secondaryButton}
        disabled={busy || !selected || workouts.length >= 7}
        onClick={() => {
          updateOrder([...workouts, selected])
          setSelected('')
        }}
      >
        Add workout
      </button>
      {workouts.length >= 7 && (
        <p className="text-muted">A series can include up to seven workouts.</p>
      )}
      {available.size === 0 && (
        <Link to="/create" className={secondaryButton}>
          Create a workout
        </Link>
      )}
      <ScheduleProblem message={problem} retry={busy ? undefined : reload} />
      {notice && <p role="status">{notice}</p>}
      <div className={scheduleActionBar}>
        <button className={primaryButton + ' w-full'} disabled={busy || workouts.length === 0}>
          {busy ? 'Saving…' : 'Save series'}
        </button>
      </div>
      <Link to={returnPath} className={secondaryButton + ' w-full'}>
        Cancel
      </Link>
    </form>
  )
}

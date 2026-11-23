import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { api } from '../api'
import ScheduleProblem from '../components/ScheduleProblem'
import { today } from '../format'
import { useJournal } from '../journal'
import { newId } from '../newId'
import { scheduleActionBar, scheduleMonday } from '../schedule'
import { input, primaryButton, secondaryButton } from '../ui'
import { readSchedule, useSchedule } from '../useSchedule'
import { useScheduleForm } from '../useScheduleForm'

export default function ScheduleAdd() {
  const { journal } = useJournal()
  const [params] = useSearchParams()
  const week = params.get('week') ?? today()
  const { state, setState, problem: loadProblem, reload } = useSchedule(week)
  const [isSeries, setIsSeries] = useState(Boolean(params.get('series')))
  const [source, setSource] = useState(params.get('series') ?? '')
  const [day, setDay] = useState(week < '2000-01-01' ? '2000-01-01' : week)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [requestId, setRequestId] = useState(newId)
  const markSaved = useScheduleForm(Boolean(source))
  const navigate = useNavigate()
  const choices = isSeries ? (state?.series ?? []) : journal.templates
  const validSource = choices.some((choice) => choice.id === source)
  const selectedSeries = isSeries ? state?.series.find((series) => series.id === source) : undefined

  function changed() {
    setRequestId(newId())
    setProblem('')
    setNotice('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!state || busy || !validSource || !day) return
    setBusy(true)
    setProblem('')
    const targetWeek = scheduleMonday(day)
    const change = isSeries
      ? { action: 'assignSeries', seriesId: source, week: targetWeek }
      : { action: 'assignWorkout', templateId: source, day }
    try {
      await api('schedule', { ...change, revision: state.revision, id: requestId })
      markSaved()
      navigate('/schedule?week=' + targetWeek, { state: { notice: 'Added to your schedule.' } })
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function reloadForRetry() {
    setBusy(true)
    try {
      setState(await readSchedule(week))
      setProblem('')
      setNotice('Schedule reloaded. Review your choices and save again.')
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <h1 className="gradient-text text-3xl font-bold">Add to schedule</h1>
      <ScheduleProblem message={loadProblem} retry={reload} />
      {!state && !loadProblem && <p role="status">Loading schedule…</p>}
      <label className="block">
        What are you planning?
        <select
          className={input + ' mt-1'}
          value={isSeries ? 'series' : 'workout'}
          disabled={busy}
          onChange={(event) => {
            setIsSeries(event.target.value === 'series')
            setSource('')
            changed()
          }}
        >
          <option value="workout">One workout on a day</option>
          <option value="series">Workout series in a week</option>
        </select>
      </label>
      <label className="block">
        {isSeries ? 'Workout series' : 'Saved workout'}
        <select
          required
          className={input + ' mt-1'}
          value={source}
          disabled={busy}
          onChange={(event) => {
            setSource(event.target.value)
            changed()
          }}
        >
          <option value="">Choose…</option>
          {choices.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {isSeries && state && !choices.length && (
        <Link to={'/schedule/series/new?week=' + week} className={secondaryButton}>
          Create a series
        </Link>
      )}
      {!isSeries && !choices.length && (
        <Link to="/create" className={secondaryButton}>
          Create a workout
        </Link>
      )}
      {selectedSeries && (
        <ol className="space-y-1">
          {selectedSeries.workouts.map((workout, index) => (
            <li key={index} className="break-words">
              Day {index + 1} · {workout.name}
            </li>
          ))}
        </ol>
      )}
      <label className="block">
        {isSeries ? 'Choose a date in the week' : 'Workout day'}
        <input
          required
          type="date"
          min={isSeries ? '1999-12-27' : '2000-01-01'}
          max="2100-12-31"
          className={input + ' mt-1'}
          value={day}
          disabled={busy}
          onChange={(event) => {
            setDay(event.target.value)
            changed()
          }}
        />
      </label>
      {isSeries && (
        <p className="text-muted">The workouts stay in order and can happen any day that week.</p>
      )}
      <ScheduleProblem message={problem} retry={busy ? undefined : reloadForRetry} />
      {notice && <p role="status">{notice}</p>}
      <div className={scheduleActionBar}>
        <button disabled={!state || busy || !validSource} className={primaryButton + ' w-full'}>
          {busy ? 'Saving…' : 'Add to schedule'}
        </button>
      </div>
      <Link to={'/schedule?week=' + week} className={secondaryButton + ' w-full'}>
        Cancel
      </Link>
    </form>
  )
}

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { api } from '../api'
import { scheduleActionBar, scheduleMonday, type ScheduledWorkout } from '../schedule'
import { input, primaryButton, textButton } from '../ui'
import { readSchedule } from '../useSchedule'
import { useScheduleForm } from '../useScheduleForm'
import ScheduleProblem from './ScheduleProblem'

export default function ScheduledPlacement({
  entry,
  revision,
}: {
  entry: ScheduledWorkout
  revision: number
}) {
  const [currentRevision, setRevision] = useState(revision)
  const [isDated, setIsDated] = useState(Boolean(entry.day))
  const [day, setDay] = useState(entry.day ?? entry.week)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')
  const dirty = isDated !== Boolean(entry.day) || day !== (entry.day ?? entry.week)
  const markSaved = useScheduleForm(dirty)
  const navigate = useNavigate()

  async function submit(change: object, week: string, message: string) {
    setBusy(true)
    setProblem('')
    try {
      await api('schedule', { ...change, id: entry.id, revision: currentRevision })
      markSaved()
      navigate('/schedule?week=' + week, { state: { notice: message } })
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || !dirty || !day) return
    const week = scheduleMonday(day)
    await submit({ action: 'editEntry', day: isDated ? day : null, week }, week, 'Workout moved.')
  }

  async function remove() {
    if (busy || !window.confirm('Remove "' + entry.workout.name + '" from the schedule?')) return
    await submit({ action: 'deleteEntry' }, entry.week, 'Workout removed from the schedule.')
  }

  async function reload() {
    setBusy(true)
    try {
      const latest = await readSchedule(entry.week)
      if (!latest.entries.some((item) => item.id === entry.id)) {
        setProblem('This workout moved or was removed on another device.')
        return
      }
      setRevision(latest.revision)
      setProblem('')
      setNotice('Schedule reloaded. Review your placement and save again.')
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={save}>
      <h2 className="text-lg font-normal">Placement</h2>
      <label className="block">
        Assign to
        <select
          className={input + ' mt-1'}
          value={isDated ? 'day' : 'week'}
          disabled={busy}
          onChange={(event) => {
            const exact = event.target.value === 'day'
            setIsDated(exact)
            if (exact && day < '2000-01-01') setDay('2000-01-01')
          }}
        >
          <option value="day">Specific day</option>
          <option value="week">Any day this week</option>
        </select>
      </label>
      <label className="block">
        {isDated ? 'Workout day' : 'Choose a date in the week'}
        <input
          className={input + ' mt-1'}
          type="date"
          required
          value={day}
          disabled={busy}
          min={isDated ? '2000-01-01' : '1999-12-27'}
          max="2100-12-31"
          onChange={(event) => setDay(event.target.value)}
        />
      </label>
      <ScheduleProblem message={problem} retry={busy ? undefined : reload} />
      {notice && <p role="status">{notice}</p>}
      <button
        type="button"
        className={textButton + ' text-danger'}
        onClick={remove}
        disabled={busy}
      >
        Remove from schedule
      </button>
      <div className={scheduleActionBar}>
        <button className={primaryButton + ' w-full'} disabled={busy || !dirty || !day}>
          {busy ? 'Saving…' : 'Save placement'}
        </button>
      </div>
    </form>
  )
}

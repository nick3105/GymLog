import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { api } from '../api'
import Notice from '../components/Notice'
import ScheduledPlacement from '../components/ScheduledPlacement'
import ScheduledWorkoutCard from '../components/ScheduledWorkoutCard'
import ScheduleProblem from '../components/ScheduleProblem'
import { today } from '../format'
import { secondaryButton } from '../ui'
import { readSchedule, useSchedule } from '../useSchedule'
import Create from './Create'

export default function ScheduledWorkout({ edit = false }: { edit?: boolean }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const week = params.get('week') ?? today()
  const { state, setState, problem, reload } = useSchedule(week)
  const [notice, setNotice] = useState('')
  const entry = state?.entries.find((item) => item.id === id)
  const workoutPath = '/schedule/' + id
  const weekQuery = '?week=' + week

  async function reloadEditor() {
    try {
      const latest = await readSchedule(week)
      if (!latest.entries.some((item) => item.id === id)) {
        setNotice('This workout moved or was removed on another device.')
        return
      }
      setState(latest)
      setNotice('Schedule reloaded. Review your targets and save again.')
    } catch (error) {
      setNotice((error as Error).message)
    }
  }

  if (edit && state && entry) {
    return (
      <>
        <button type="button" onClick={reloadEditor} className={secondaryButton + ' mb-4'}>
          Reload schedule
        </button>
        {notice && (
          <p role="status" className="mb-3">
            {notice}
          </p>
        )}
        <Create
          key={entry.id}
          scheduled={{
            workout: entry.workout,
            returnPath: workoutPath + weekQuery,
            save: async (workout) => {
              await api('schedule', {
                action: 'editEntry',
                id,
                revision: state.revision,
                day: entry.day,
                week: entry.week,
                workout,
              })
            },
          }}
        />
      </>
    )
  }

  return (
    <>
      <Notice />
      <h1 className="gradient-text mb-4 text-3xl font-bold">Scheduled workout</h1>
      <ScheduleProblem message={problem} retry={reload} />
      {!state && !problem && <p role="status">Loading workout…</p>}
      {state && !entry && (
        <p role="alert">That scheduled workout could not be found in this week.</p>
      )}
      {state && entry && (
        <>
          <ScheduledWorkoutCard entry={entry} details />
          <Link to={workoutPath + '/edit' + weekQuery} className={secondaryButton + ' mt-4 w-full'}>
            Adjust sets, reps and weight
          </Link>
          <ScheduledPlacement key={entry.id} entry={entry} revision={state.revision} />
        </>
      )}
      <Link to={'/schedule' + weekQuery} className={secondaryButton + ' mt-4 w-full'}>
        Back to schedule
      </Link>
    </>
  )
}

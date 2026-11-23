import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { api } from '../api'
import Notice from '../components/Notice'
import ScheduledPlacement from '../components/ScheduledPlacement'
import ScheduledWorkoutCard from '../components/ScheduledWorkoutCard'
import ScheduleProblem from '../components/ScheduleProblem'
import { today } from '../format'
import { useJournal, type ActiveWorkout } from '../journal'
import { scheduleActionBar } from '../schedule'
import { primaryButton, secondaryButton } from '../ui'
import { readSchedule, useSchedule } from '../useSchedule'
import Create from './Create'

export default function ScheduledWorkout({ edit = false }: { edit?: boolean }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const week = params.get('week') ?? today()
  const { state, setState, problem, reload } = useSchedule(week)
  const { active, journal, refresh, setActive } = useJournal()
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')
  const [actionProblem, setActionProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const [placementDirty, setPlacementDirty] = useState(false)
  const entry = state?.entries.find((item) => item.id === id)
  const localDraft = entry && active?.scheduleEntryId === entry.id
  const inProgress = entry?.inProgress || localDraft
  const completed = entry?.sessionId
  const hasOtherDraft = active && !localDraft
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

  async function startWorkout() {
    if (!state || !entry || busy || completed || hasOtherDraft || placementDirty) return
    if (localDraft) {
      navigate('/session')
      return
    }
    setBusy(true)
    setActionProblem('')
    try {
      const result = await api<{ draft: ActiveWorkout }>(`schedule/${entry.id}/start`, {
        revision: state.revision,
        timezoneOffset: new Date().getTimezoneOffset(),
      })
      setActive(result.draft, false)
      navigate('/session')
    } catch (error) {
      setActionProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function loadReview() {
    if (!completed || busy) return
    setBusy(true)
    setActionProblem('')
    try {
      await refresh()
      navigate(`/review/${completed}`)
    } catch (error) {
      setActionProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (edit && state && entry && !inProgress && !completed) {
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
          <ScheduledWorkoutCard entry={{ ...entry, inProgress }} details />
          {!inProgress && !completed && (
            <>
              <Link
                to={workoutPath + '/edit' + weekQuery}
                className={secondaryButton + ' mt-4 w-full'}
              >
                Adjust sets, reps and weight
              </Link>
              <ScheduledPlacement
                key={entry.id}
                entry={entry}
                revision={state.revision}
                onDirtyChange={setPlacementDirty}
              />
            </>
          )}
        </>
      )}
      <Link to={'/schedule' + weekQuery} className={secondaryButton + ' mt-4 w-full'}>
        Back to schedule
      </Link>
      {entry && (
        <div className={scheduleActionBar}>
          {actionProblem && (
            <ScheduleProblem
              message={actionProblem}
              retry={() => {
                setActionProblem('')
                reload()
              }}
            />
          )}
          {completed ? (
            journal.sessions.some((session) => session.id === completed) ? (
              <Link to={`/review/${completed}`} className={primaryButton + ' w-full'}>
                Review workout
              </Link>
            ) : (
              <button
                type="button"
                className={primaryButton + ' w-full'}
                onClick={loadReview}
                disabled={busy}
              >
                {busy ? 'Opening…' : 'Review workout'}
              </button>
            )
          ) : hasOtherDraft ? (
            <>
              <p className="text-muted mb-2">Finish or discard your current workout first.</p>
              <Link to="/session" className={secondaryButton + ' w-full'}>
                Open current workout
              </Link>
            </>
          ) : (
            <>
              {placementDirty && (
                <p className="text-muted mb-2">Save your placement changes first.</p>
              )}
              <button
                type="button"
                className={primaryButton + ' w-full'}
                onClick={startWorkout}
                disabled={busy || placementDirty}
              >
                {busy ? 'Opening…' : inProgress ? 'Resume workout' : 'Start workout'}
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

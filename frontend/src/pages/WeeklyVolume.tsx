import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useBlocker } from 'react-router'

import { useJournal } from '../journal'
import { api } from '../api'
import { formatDay, formatNumber } from '../format'
import { card, errorText, input, label, primaryButton, secondaryButton } from '../ui'

type Contribution = {
  id: string
  name: string
  day: string
  sets: number
  coefficient: number
  contribution: number
}
type MuscleVolume = {
  muscle: string
  direct: number
  indirect: number
  total: number
  goal: number | null
  goalSource: 'saved' | 'starter'
  exercises: Contribution[]
}
type Volume = {
  weekStart: string
  weekEnd: string
  muscles: MuscleVolume[]
  excluded: Record<string, number>
  countedSets: number
  draftPreview: boolean
  startingGoal: number | null
  mappingVersion: string
  goals: Record<string, number>
  revision: number
}

function weekDate(offset: number, week?: string): string {
  const date = week ? new Date(week + 'T12:00:00') : new Date()
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + offset * 7)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function muscleName(muscle: string): string {
  return muscle.replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase())
}

export default function WeeklyVolume() {
  const { setBuilderDirty } = useJournal()
  const [baseline, setBaseline] = useState('')
  const [week, setWeek] = useState(() => weekDate(0))
  const [volume, setVolume] = useState<Volume | null>(null)
  const [goals, setGoals] = useState<Record<string, string>>({})
  const [revision, setRevision] = useState(0)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')
  const initialized = useRef(false)

  const currentPreferences = JSON.stringify({ goals })
  const dirty = baseline !== '' && currentPreferences !== baseline
  useEffect(() => {
    setBuilderDirty(dirty)
    return () => setBuilderDirty(false)
  }, [dirty, setBuilderDirty])
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Leave without saving your volume goals?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    let current = true
    api<Volume>(`volume?week=${week}`)
      .then((result) => {
        if (!current) return
        setVolume(result)
        if (!initialized.current) {
          setGoals(
            Object.fromEntries(
              result.muscles
                .filter((muscle) => muscle.goal !== null)
                .map((muscle) => [muscle.muscle, String(muscle.goal)]),
            ),
          )
          setRevision(result.revision)
          setBaseline(
            JSON.stringify({
              goals: Object.fromEntries(
                result.muscles
                  .filter((muscle) => muscle.goal !== null)
                  .map((muscle) => [muscle.muscle, String(muscle.goal)]),
              ),
            }),
          )
          initialized.current = true
        }
      })
      .catch((error: Error) => current && setProblem(error.message))
    return () => {
      current = false
    }
  }, [week])

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setProblem('')
    setNotice('')
    try {
      const values = Object.fromEntries(
        Object.entries(goals)
          .filter(([, value]) => value.trim() !== '')
          .map(([key, value]) => [key, Number(value)]),
      )
      const saved = await api<{
        goals: Record<string, number>
        revision: number
      }>('volume/preferences', { goals: values, revision })
      setRevision(saved.revision)
      const updated = await api<Volume>(`volume?week=${week}`)
      const updatedGoals = Object.fromEntries(
        updated.muscles
          .filter((muscle) => muscle.goal !== null)
          .map((muscle) => [muscle.muscle, String(muscle.goal)]),
      )
      setVolume(updated)
      setGoals(updatedGoals)
      setBaseline(JSON.stringify({ goals: updatedGoals }))
      setNotice('Your goals are saved.')
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Link to="/review" className={secondaryButton}>
        Back to workouts
      </Link>
      <h1 className="gradient-text mt-4 text-3xl font-bold">Weekly volume</h1>
      <p className="text-muted my-3">
        Estimated performed sets by muscle. Compare them with your own goals.
      </p>
      <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          type="button"
          aria-label="Previous week"
          disabled={saving}
          onClick={() => {
            setVolume(null)
            setWeek(weekDate(-1, week))
          }}
          className={secondaryButton}
        >
          ←
        </button>
        <span className="text-center">
          {formatDay(week)}
          <br />
          to {volume ? formatDay(volume.weekEnd) : '…'}
        </span>
        <button
          type="button"
          aria-label="Next week"
          disabled={saving}
          onClick={() => {
            setVolume(null)
            setWeek(weekDate(1, week))
          }}
          className={secondaryButton}
        >
          →
        </button>
      </div>
      {problem && (
        <p role="alert" className={errorText}>
          {problem}
        </p>
      )}
      {!volume && <p className="text-muted">Loading volume…</p>}
      {volume && (
        <form onSubmit={save}>
          <fieldset disabled={saving} className="min-w-0">
            <div className={`${card} mb-4`}>
              <p className="font-normal">Default weekly goal · 10 sets per muscle group</p>
              <p className="text-muted mt-2">
                Edit any goal below. Empty fields return to 10 when saved.
              </p>
              <details className="mt-2">
                <summary className="text-accent min-h-11 cursor-pointer py-3">
                  How sets are counted
                </summary>
                <p className="text-muted">
                  Direct sets count as 1 and indirect work as 0.5. Muscle contributions are
                  estimated. Excluded exercises are listed below.
                </p>
              </details>
            </div>
            <div className="flex flex-col gap-3">
              {volume.muscles.map((muscle) => (
                <section key={muscle.muscle} className={card}>
                  <h2 className="text-xl">{muscleName(muscle.muscle)}</h2>
                  <p className="font-mono text-2xl">
                    {formatNumber(muscle.total)}{' '}
                    <span className="text-muted text-base">estimated sets</span>
                  </p>
                  <p className="text-muted">
                    {formatNumber(muscle.direct)} direct + {formatNumber(muscle.indirect)} indirect
                  </p>
                  <p className="text-muted">
                    {muscle.goalSource === 'saved' ? 'Your saved goal' : 'Default goal'} ·{' '}
                    {muscle.goal === null ? 'Not set' : `${formatNumber(muscle.goal)} sets`}
                  </p>
                  <label className="mt-3 block">
                    <span className={label}>Weekly goal (sets)</span>
                    <input
                      className={input}
                      inputMode="decimal"
                      aria-label={`${muscleName(muscle.muscle)} weekly goal (sets)`}
                      value={goals[muscle.muscle] ?? ''}
                      placeholder="Not set"
                      onChange={(event) =>
                        setGoals({
                          ...goals,
                          [muscle.muscle]: event.target.value.replace(',', '.'),
                        })
                      }
                    />
                  </label>
                  {muscle.exercises.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-accent min-h-11 cursor-pointer py-3">
                        Exercise breakdown
                      </summary>
                      <ul className="flex flex-col gap-2">
                        {muscle.exercises.map((exercise, index) => (
                          <li key={`${exercise.id}-${index}`} className="text-muted">
                            {exercise.name} · {formatDay(exercise.day)}
                            <br />
                            {exercise.sets} sets × {exercise.coefficient} ={' '}
                            {formatNumber(exercise.contribution)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </section>
              ))}
            </div>
            <section className={`${card} mt-4`}>
              <h2 className="text-xl">Excluded coverage</h2>
              {Object.keys(volume.excluded).length === 0 ? (
                <p className="text-muted">No excluded performed sets this week.</p>
              ) : (
                <ul>
                  {Object.entries(volume.excluded).map(([reason, count]) => (
                    <li key={reason} className="text-muted">
                      {reason} · {count} sets
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-muted mt-2">
                Personal exercises count as 1 set for their selected primary muscle. None, older
                personal exercises and timed holds are excluded. Warmup/cooldown text has no sets.
              </p>
            </section>
            <div className="bg-ink/95 sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-4 flex flex-col gap-2 rounded-lg p-3 backdrop-blur md:bottom-4">
              {notice && <p role="status">{notice}</p>}
              <button disabled={saving} className={primaryButton}>
                {saving ? 'Saving…' : 'Save goals'}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  )
}

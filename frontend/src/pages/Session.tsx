import { Check } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { api } from '../api'
import ExerciseLink from '../components/ExerciseLink'
import { formatDay, formatNumber, formatSet } from '../format'
import { useJournal, type ActiveWorkout } from '../journal'
import { bestOneRepMax, type SetInput } from '../oneRepMax'
import type { ExerciseStats, Session as SavedSession } from '../types'
import { card, errorText, input, primaryButton } from '../ui'

const fields: { key: keyof SetInput; label: string; mode: 'decimal' | 'numeric' }[] = [
  { key: 'weight', label: 'kg', mode: 'decimal' },
  { key: 'reps', label: 'Reps', mode: 'numeric' },
  { key: 'rpe', label: 'RPE', mode: 'decimal' },
]

// RUN-02 to RUN-10: log the actual sets of the workout in progress, then save it.
export default function Session() {
  const { active, setActive, setJournal } = useJournal()
  const navigate = useNavigate()
  const [lastTime, setLastTime] = useState<Record<string, ExerciseStats['last']>>({})
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  // Set once the workout is saved, so clearing it does not bounce us to Start workout.
  const [finished, setFinished] = useState(false)
  const exerciseIds = active?.exercises.map((exercise) => exercise.id).join(',') ?? ''

  // RUN-04: what you did last time, from any workout, above each exercise.
  useEffect(() => {
    if (!exerciseIds) return
    let current = true
    Promise.all(
      exerciseIds.split(',').map(async (id) => {
        const stats = await api<ExerciseStats>(`exercises/${encodeURIComponent(id)}/stats`)
        return [id, stats.last] as const
      }),
    )
      .then((results) => current && setLastTime(Object.fromEntries(results)))
      .catch(() => current && setLastTime({}))
    return () => {
      current = false
    }
  }, [exerciseIds])

  if (!active) return finished ? null : <Navigate to="/start" replace />
  const workout: ActiveWorkout = active

  const complete = workout.exercises.every((exercise) =>
    exercise.sets.every((set) => set.weight !== '' && set.reps !== ''),
  )
  // The first set without weight or reps is the one you are on.
  const current = workout.exercises
    .flatMap((exercise, exerciseIndex) =>
      exercise.sets.map((set, setIndex) => ({ exerciseIndex, setIndex, set })),
    )
    .find(({ set }) => set.weight === '' || set.reps === '')

  function update(exerciseIndex: number, setIndex: number, key: keyof SetInput, value: string) {
    setActive({
      ...workout,
      exercises: workout.exercises.map((exercise, i) =>
        i !== exerciseIndex
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set, j) =>
                j === setIndex ? { ...set, [key]: value } : set,
              ),
            },
      ),
    })
  }

  function discard() {
    if (!window.confirm('Discard this workout? Nothing from it will be saved.')) return
    setActive(null)
    navigate('/start')
  }

  async function finish(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setProblem('')
    try {
      const saved = await api<SavedSession>('sessions', {
        clientId: workout.clientId,
        templateId: workout.templateId,
        day: workout.day,
        exercises: workout.exercises.map((exercise) => ({
          id: exercise.id,
          sets: exercise.sets.map((set) => ({
            weight: Number(set.weight),
            reps: Number(set.reps),
            rpe: set.rpe === '' ? null : Number(set.rpe),
          })),
        })),
      })
      setJournal((journal) => ({
        ...journal,
        sessions: [saved, ...journal.sessions.filter((session) => session.id !== saved.id)],
      }))
      setFinished(true)
      setActive(null)
      navigate(`/review/${saved.id}`, { state: { notice: 'Workout saved. Well done.' } })
    } catch (error) {
      // Every number stays where it is; tapping Finish again retries with the same ID.
      setProblem((error as Error).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={finish} noValidate>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold">{workout.name}</h1>
          <p className="text-muted">{formatDay(workout.day)} · not saved until you finish</p>
        </div>
        <button
          type="button"
          onClick={discard}
          className="text-danger min-h-11 shrink-0 px-1 font-semibold"
        >
          Discard
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {workout.exercises.map((exercise, exerciseIndex) => {
          const estimate = bestOneRepMax(exercise.sets)
          const last = lastTime[exercise.id]
          return (
            <section key={exercise.id} className={card}>
              <div className="flex items-start justify-between gap-3">
                <ExerciseLink id={exercise.id} name={exercise.name} />
                <p className="shrink-0 text-right">
                  <span className="text-muted block text-xs">Est. 1RM</span>
                  <span className="text-lime font-bold">
                    {estimate === null ? '–' : `${formatNumber(estimate)} kg`}
                  </span>
                </p>
              </div>
              <p className="text-muted mb-3 text-sm">
                {last === undefined
                  ? 'Last time: …'
                  : last === null
                    ? 'No previous results'
                    : `Last time · ${formatDay(last.day)}: ${last.sets.map(formatSet).join(', ')}`}
              </p>
              <div
                className="text-muted grid grid-cols-[1.75rem_1fr_1fr_1fr] gap-2 text-xs"
                aria-hidden
              >
                <span>Set</span>
                <span>kg</span>
                <span>Reps</span>
                <span>RPE</span>
              </div>
              {exercise.sets.map((set, setIndex) => {
                const target = exercise.targets[setIndex]
                const isCurrent =
                  current?.exerciseIndex === exerciseIndex && current.setIndex === setIndex
                const placeholders = {
                  weight:
                    target?.weight === null || target?.weight === undefined
                      ? 'kg'
                      : formatNumber(target.weight),
                  reps: target ? String(target.reps) : 'reps',
                  rpe:
                    target?.rpe === null || target?.rpe === undefined
                      ? '–'
                      : formatNumber(target.rpe),
                }
                return (
                  <div
                    key={setIndex}
                    className={`mt-2 grid grid-cols-[1.75rem_1fr_1fr_1fr] items-center gap-2 ${isCurrent ? 'outline-lime/60 rounded-xl outline-2 outline-offset-4' : ''}`}
                  >
                    <span className="text-muted text-center font-semibold">{setIndex + 1}</span>
                    {fields.map(({ key, label, mode }) => (
                      <input
                        key={key}
                        type="text"
                        inputMode={mode}
                        aria-label={`${exercise.name}, set ${setIndex + 1}, ${label}`}
                        placeholder={placeholders[key]}
                        value={set[key]}
                        onChange={(event) =>
                          update(exerciseIndex, setIndex, key, event.target.value.replace(',', '.'))
                        }
                        className={`${input} text-center`}
                      />
                    ))}
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>

      <p className="text-muted mt-4 text-sm">
        Placeholders are your targets. Enter what you actually did; 0 kg is fine for bodyweight
        sets. RPE is optional.
      </p>

      <div className="border-border bg-ink/95 sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-4 flex flex-col gap-2 rounded-2xl border p-3 backdrop-blur md:bottom-4">
        {problem && (
          <p role="alert" className={errorText}>
            {problem}
          </p>
        )}
        {!complete && (
          <p className="text-muted text-sm">Enter weight and reps for every set to finish.</p>
        )}
        <button type="submit" disabled={!complete || saving} className={primaryButton}>
          <Check className="size-5" aria-hidden />
          {saving ? 'Saving…' : 'Finish & save'}
        </button>
      </div>
    </form>
  )
}

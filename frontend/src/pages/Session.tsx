import { personalVolumeDescription } from '../personalVolume'
import { Check, Link2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { api } from '../api'
import NoteInput from '../components/NoteInput'
import WorkoutReminder from '../components/WorkoutReminder'
import { trainingSequence, supersetLabel } from '../supersets'
import ExerciseLink from '../components/ExerciseLink'
import { formatDay, formatNumber, formatSet } from '../format'
import { useJournal, type ActiveWorkout } from '../journal'
import { bestOneRepMax, type SetInput } from '../oneRepMax'
import { durationFields, repFields, isSetComplete, setPayload } from '../setInput'
import type { ExerciseStats, Session as SavedSession } from '../types'
import { card, errorText, input, primaryButton, secondaryButton, textButton } from '../ui'

// RUN-02 to RUN-10: log the actual sets of the workout in progress, then save it.
export default function Session() {
  const { active, draftStatus, setActive, discardActiveDraft, retryDraft, setJournal } =
    useJournal()
  const navigate = useNavigate()
  const [lastTime, setLastTime] = useState<Record<string, ExerciseStats['last']>>({})
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const [discarding, setDiscarding] = useState(false)
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
  const rpeEnabled = workout.rpeEnabled ?? true
  const visibleRepFields = repFields.filter((field) => rpeEnabled || field.key !== 'rpe')
  const visibleDurationFields = durationFields.filter((field) => rpeEnabled || field.key !== 'rpe')

  const hasPerformedSet = workout.exercises.some((exercise) =>
    exercise.sets.some((set) => isSetComplete(set)),
  )
  const complete =
    hasPerformedSet &&
    workout.exercises.every((exercise) =>
      exercise.sets.every((set) => set.skipped || isSetComplete(set)),
    )
  const sequence = trainingSequence(workout.exercises)
  const current = sequence.find(({ exerciseIndex, setIndex }) => {
    const set = workout.exercises[exerciseIndex].sets[setIndex]
    return !set.skipped && !isSetComplete(set)
  })

  function showSet(exerciseIndex: number, setIndex: number) {
    document
      .getElementById(`actual-${workout.exercises[exerciseIndex].id}-${setIndex}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  function update(
    exerciseIndex: number,
    setIndex: number,
    key: keyof SetInput,
    value: string | boolean,
  ) {
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

  function addSet(exerciseIndex: number) {
    const exercise = workout.exercises[exerciseIndex]
    if (saving || exercise.sets.length >= 20) return
    setActive({
      ...workout,
      exercises: workout.exercises.map((item, index) =>
        index === exerciseIndex
          ? {
              ...item,
              sets: [
                ...item.sets,
                {
                  weight: '',
                  reps: '',
                  rpe: '',
                  ...(item.measurement === 'duration' ? { durationSeconds: '' } : {}),
                },
              ],
            }
          : item,
      ),
    })
    requestAnimationFrame(() => {
      document
        .getElementById(`actual-${exercise.id}-${exercise.sets.length}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  async function discard() {
    if (!window.confirm('Discard this workout? Nothing from it will be saved.')) return
    setDiscarding(true)
    setProblem('')
    try {
      await discardActiveDraft()
      navigate('/start')
    } catch (error) {
      setProblem((error as Error).message)
      setDiscarding(false)
    }
  }

  async function finish(event: FormEvent) {
    event.preventDefault()
    if (!complete || saving) return
    setSaving(true)
    setProblem('')
    try {
      const saved = await api<SavedSession>('sessions', {
        clientId: workout.clientId,
        startedAt: workout.startedAt,
        scheduleEntryId: workout.scheduleEntryId,
        templateId: workout.templateId,
        day: workout.day,
        note: workout.note ?? '',
        warmup: workout.warmup ?? '',
        cooldown: workout.cooldown ?? '',
        warmupDone: workout.warmupDone ?? false,
        cooldownDone: workout.cooldownDone ?? false,
        exercises: workout.exercises.map((exercise) => ({
          id: exercise.id,
          note: exercise.note ?? '',
          supersetId: exercise.supersetId,
          sets: exercise.sets.map((set) => setPayload(set, rpeEnabled)),
        })),
      })
      setJournal((journal) => ({
        ...journal,
        sessions: [saved, ...journal.sessions.filter((session) => session.id !== saved.id)],
      }))
      setFinished(true)
      setActive(null, false)
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
          <h1 className="gradient-text truncate text-3xl font-bold">{workout.name}</h1>
          <p className="text-muted">
            {formatDay(workout.day)} ·{' '}
            {draftStatus === 'saved'
              ? 'Progress saved'
              : draftStatus === 'error'
                ? 'Progress not saved'
                : 'Saving progress…'}
          </p>
        </div>
        <button
          type="button"
          onClick={discard}
          disabled={discarding || saving}
          className="text-danger min-h-11 shrink-0 px-1 font-normal"
        >
          Discard
        </button>
      </div>

      <NoteInput
        label="Workout note"
        maximum={1000}
        value={workout.note ?? ''}
        disabled={saving}
        onChange={(value) => setActive({ ...workout, note: value })}
      />
      <div className="mb-4">
        <WorkoutReminder
          title="Warmup"
          text={workout.warmup}
          done={workout.warmupDone}
          disabled={saving}
          onChange={(done) => setActive({ ...workout, warmupDone: done })}
        />
      </div>
      {current && (
        <button
          type="button"
          className={`${secondaryButton} mb-4 w-full`}
          onClick={() => showSet(current.exerciseIndex, current.setIndex)}
        >
          Next · {workout.exercises[current.exerciseIndex].name} · Set {current.setIndex + 1}
        </button>
      )}
      {workout.exercises.some((exercise) => exercise.supersetId) && (
        <details className={`${card} mb-4`}>
          <summary className="min-h-11 cursor-pointer font-normal">Superset sequence</summary>
          <ol className="grid gap-2">
            {sequence
              .filter(({ exerciseIndex }) => workout.exercises[exerciseIndex].supersetId)
              .map(({ exerciseIndex, setIndex }) => (
                <li key={`${exerciseIndex}-${setIndex}`}>
                  <button
                    type="button"
                    className={`${textButton} text-left`}
                    onClick={() => showSet(exerciseIndex, setIndex)}
                  >
                    {supersetLabel(workout.exercises, exerciseIndex)} ·{' '}
                    {workout.exercises[exerciseIndex].name} · Set {setIndex + 1}
                  </button>
                </li>
              ))}
          </ol>
        </details>
      )}
      <div className="flex flex-col gap-4">
        {workout.exercises.map((exercise, exerciseIndex) => {
          const estimate = bestOneRepMax(exercise.sets, rpeEnabled)
          const fields =
            exercise.measurement === 'duration' ? visibleDurationFields : visibleRepFields
          const columns =
            fields.length === 1
              ? 'grid-cols-[1.75rem_1fr]'
              : fields.length === 2
                ? 'grid-cols-[1.75rem_1fr_1fr]'
                : 'grid-cols-[1.75rem_1fr_1fr_1fr]'
          const last = lastTime[exercise.id]
          return (
            <section
              key={exercise.id}
              className={`${card} ${exercise.supersetId ? 'border-accent border-l-2' : ''} ${exercise.supersetId && workout.exercises[exerciseIndex - 1]?.supersetId === exercise.supersetId ? '-mt-4 rounded-t-none border-t' : ''}`}
            >
              {exercise.supersetId && (
                <p className="text-accent mb-2 flex items-center gap-2">
                  <Link2 className="size-5" aria-hidden />
                  {supersetLabel(workout.exercises, exerciseIndex)}
                </p>
              )}
              <div className="flex items-start justify-between gap-3">
                <ExerciseLink id={exercise.id} name={exercise.name} />
                {exercise.measurement !== 'duration' && (
                  <p className="shrink-0 text-right">
                    <span className="text-muted block text-xs">Est. 1RM</span>
                    <span className="text-accent font-light">
                      {estimate === null ? '–' : `${formatNumber(estimate)} kg`}
                    </span>
                  </p>
                )}
              </div>
              {exercise.source === 'personal' && (
                <p className="text-muted mt-2">{personalVolumeDescription(exercise)}</p>
              )}
              <NoteInput
                label={`${exercise.name} exercise note`}
                maximum={500}
                value={exercise.note ?? ''}
                disabled={saving}
                onChange={(value) =>
                  setActive({
                    ...workout,
                    exercises: workout.exercises.map((item, index) =>
                      index === exerciseIndex ? { ...item, note: value } : item,
                    ),
                  })
                }
              />
              <p className="text-muted mb-3 text-sm">
                {last === undefined
                  ? 'Last time: …'
                  : last === null
                    ? 'No previous results'
                    : `Last time · ${formatDay(last.day)}: ${last.sets.map(formatSet).join(', ')}`}
              </p>
              <div className={`text-muted grid ${columns} gap-2 text-xs`} aria-hidden>
                <span>Set</span>
                {fields.map((field) => (
                  <span key={field.key}>{field.label}</span>
                ))}
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
                  durationSeconds:
                    target?.durationSeconds === undefined
                      ? 'seconds'
                      : String(target.durationSeconds),
                  rpe:
                    target?.rpe === null || target?.rpe === undefined
                      ? '–'
                      : formatNumber(target.rpe),
                }
                return (
                  <div key={setIndex} id={`actual-${exercise.id}-${setIndex}`} className="mt-3">
                    {setIndex >= exercise.targets.length && (
                      <p className="text-muted mb-2 text-sm">Extra set · today only</p>
                    )}
                    {set.skipped ? (
                      <div className="border-border text-muted flex min-h-12 items-center justify-between gap-2 rounded-full border px-3">
                        <span>Set {setIndex + 1} · Skipped</span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => update(exerciseIndex, setIndex, 'skipped', false)}
                          aria-label={`Restore ${exercise.name} set ${setIndex + 1}`}
                          className="text-accent min-h-11 px-2 font-normal"
                        >
                          Restore set
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`mt-2 grid ${columns} items-center gap-2 ${isCurrent ? 'outline-accent/60 rounded-xl outline-2 outline-offset-4' : ''}`}
                        >
                          <span className="text-muted text-center font-normal">{setIndex + 1}</span>
                          {fields.map(({ key, label, mode }) => (
                            <input
                              key={key}
                              type="text"
                              disabled={saving}
                              inputMode={mode}
                              aria-label={`${exercise.name}, set ${setIndex + 1}, ${label}`}
                              placeholder={placeholders[key]}
                              value={set[key] ?? ''}
                              onChange={(event) =>
                                update(
                                  exerciseIndex,
                                  setIndex,
                                  key,
                                  event.target.value.replace(',', '.'),
                                )
                              }
                              className={`${input} text-center`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => update(exerciseIndex, setIndex, 'skipped', true)}
                            aria-label={`Skip ${exercise.name} set ${setIndex + 1}`}
                            className="text-muted min-h-11 px-2 font-normal"
                          >
                            Skip set
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              <button
                type="button"
                onClick={() => addSet(exerciseIndex)}
                disabled={saving || exercise.sets.length >= 20}
                aria-label={`Add set to ${exercise.name}`}
                className={`${secondaryButton} mt-3 w-full`}
              >
                + Add set
              </button>
              {exercise.sets.length >= 20 && (
                <p className="text-muted mt-2 text-sm">Maximum 20 sets per exercise.</p>
              )}
            </section>
          )
        })}
      </div>

      <div className="mt-4">
        <WorkoutReminder
          title="Cooldown"
          text={workout.cooldown}
          done={workout.cooldownDone}
          disabled={saving}
          onChange={(done) => setActive({ ...workout, cooldownDone: done })}
        />
      </div>
      <p className="text-muted mt-4 text-sm">
        Placeholders are your targets. Enter seconds for timed holds; 0 kg is fine for bodyweight
        sets. {rpeEnabled && 'RPE is optional. '}Changes apply to this session only.
      </p>

      <div className="border-border bg-ink/95 sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-4 flex flex-col gap-2 rounded-2xl border p-3 backdrop-blur md:bottom-4">
        {problem && (
          <p role="alert" className={errorText}>
            {problem}
          </p>
        )}
        {draftStatus === 'error' && !problem && (
          <div role="alert" className="flex items-center justify-between gap-2">
            <p className={errorText}>Your latest workout changes could not be saved.</p>
            <button
              type="button"
              onClick={retryDraft}
              className="text-accent min-h-11 shrink-0 px-2 font-normal"
            >
              Retry save
            </button>
          </div>
        )}
        {!complete && (
          <p className="text-muted text-sm">
            {hasPerformedSet
              ? 'Complete or skip each remaining set to finish.'
              : 'Complete at least one set to save this workout.'}
          </p>
        )}
        <button type="submit" disabled={!complete || saving} className={primaryButton}>
          <Check className="size-5" aria-hidden />
          {saving ? 'Saving…' : 'Finish & save'}
        </button>
      </div>
    </form>
  )
}

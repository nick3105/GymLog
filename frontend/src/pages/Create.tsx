import { Check, GripVertical, Link2, Unlink, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'

import { api, ApiError } from '../api'
import type { CoacheeJournal } from '../coaching'
import ExerciseLink from '../components/ExerciseLink'
import ExercisePicker from '../components/ExercisePicker'
import NoteInput from '../components/NoteInput'
import ReorderList from '../components/ReorderList'
import WorkoutInstructions from '../components/WorkoutInstructions'
import { exerciseUnits, linkExercises, unlinkSuperset, supersetLabel } from '../supersets'
import { moveItem } from '../reorder'
import { newId } from '../newId'
import { useJournal } from '../journal'
import { targetsFor } from '../targets'
import type { Exercise, Template } from '../types'
import { card, errorText, input, label, primaryButton, secondaryButton, textButton } from '../ui'

type TargetInput = { reps: string; weight: string; rpe: string; durationSeconds: string }
type Planned = Exercise & { note?: string; supersetId?: string; targets: TargetInput[] }

const newTarget = (): TargetInput => ({ reps: '8', weight: '', rpe: '', durationSeconds: '60' })

const targetFields: { key: keyof TargetInput; label: string; mode: 'decimal' | 'numeric' }[] = [
  { key: 'reps', label: 'Reps', mode: 'numeric' },
  { key: 'weight', label: 'kg', mode: 'decimal' },
  { key: 'rpe', label: 'RPE', mode: 'decimal' },
]

const durationTargetFields: typeof targetFields = [
  { key: 'durationSeconds', label: 'Seconds', mode: 'numeric' },
  { key: 'rpe', label: 'RPE', mode: 'decimal' },
]

// PLN-01 to PLN-11: plan a workout once, with targets for every set.
export default function Create({
  coaching,
}: {
  coaching?: { journal: CoacheeJournal; onUnavailable: (message: string) => void }
}) {
  const { journal: ownJournal, setJournal, setBuilderDirty, active } = useJournal()
  const journal = coaching ? { ...ownJournal, ...coaching.journal } : ownJournal
  const returnPath = coaching ? `/coachees/${coaching.journal.owner.id}` : '/start'
  const navigate = useNavigate()
  const { id } = useParams()
  const original = journal.templates.find((template) => template.id === id)
  const [note, setNote] = useState(original?.note ?? '')
  const [name, setName] = useState(original?.name ?? '')
  const [warmup, setWarmup] = useState(original?.warmup ?? '')
  const [cooldown, setCooldown] = useState(original?.cooldown ?? '')
  const [pairNotice, setPairNotice] = useState('')
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null)
  const [draggedExerciseIndex, setDraggedExerciseIndex] = useState<number | null>(null)
  const [draggedOverExerciseIndex, setDraggedOverExerciseIndex] = useState<number | null>(null)
  const [planned, setPlanned] = useState<Planned[]>(
    () =>
      original?.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        note: exercise.note ?? '',
        source: exercise.source,
        volumeEligible: exercise.volumeEligible,
        measurement: exercise.measurement,
        supersetId: exercise.supersetId,
        group: journal.exercises.find((item) => item.id === exercise.id)?.group ?? '',
        targets: targetsFor(exercise).map((target) => ({
          reps: target.reps === undefined ? '' : String(target.reps),
          durationSeconds:
            target.durationSeconds === undefined ? '60' : String(target.durationSeconds),
          weight:
            target.weight === null || target.weight === undefined ? '' : String(target.weight),
          rpe: target.rpe === null ? '' : String(target.rpe),
        })),
      })) ?? [],
  )
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const saved = useRef(false)
  const dirty =
    name.trim() !== '' || planned.length > 0 || note !== '' || warmup !== '' || cooldown !== ''

  useEffect(() => {
    setBuilderDirty(dirty)
    return () => setBuilderDirty(false)
  }, [dirty, setBuilderDirty])

  // PLN-11: leaving with something typed asks first. Opening exercise progress stays on this
  // page (only ?exercise= changes), so it never asks.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Leave without saving this workout?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  function add(exercise: Exercise) {
    setProblem('')
    // PLN-03: the same exercise again adds a set to its card.
    if (planned.some((item) => item.id === exercise.id)) {
      setActiveExerciseIndex(planned.findIndex((item) => item.id === exercise.id))
      setPlanned(
        planned.map((item) =>
          item.id === exercise.id && item.targets.length < 20
            ? { ...item, targets: [...item.targets, newTarget()] }
            : item,
        ),
      )
      return
    }
    if (planned.length >= 20) {
      setProblem('A workout can have up to 20 exercises.')
      return
    }
    setActiveExerciseIndex(planned.length)
    setPlanned([...planned, { ...exercise, targets: [newTarget(), newTarget(), newTarget()] }])
  }

  async function removeFavorite(exerciseId: string) {
    setProblem('')
    try {
      const result = await api<{ exerciseId: string; favorite: boolean }>(
        `exercises/${exerciseId}/favorite`,
        {},
      )
      setJournal((current) => ({
        ...current,
        favoriteExerciseIds: result.favorite
          ? [...current.favoriteExerciseIds, result.exerciseId]
          : current.favoriteExerciseIds.filter((item) => item !== result.exerciseId),
      }))
    } catch (error) {
      setProblem((error as Error).message)
    }
  }

  function changeTargets(id: string, targets: TargetInput[]) {
    setPlanned(planned.map((item) => (item.id === id ? { ...item, targets } : item)))
  }

  function pair(firstId: string, secondId: string) {
    const changed = linkExercises(planned, firstId, secondId, newId())
    setPlanned(changed)
    setPairNotice('Superset linked. Use Unlink superset to separate the exercises.')
  }

  function removeExercise(item: Planned) {
    if (item.supersetId && !window.confirm(`Remove ${item.name} and unlink its superset?`)) return
    const unpaired = item.supersetId ? unlinkSuperset(planned, item.supersetId) : planned
    const next = unpaired.filter((exercise) => exercise.id !== item.id)
    setActiveExerciseIndex((current) =>
      current === null ? null : Math.min(current, Math.max(0, next.length - 1)),
    )
    setPlanned(next)
  }

  function removeExerciseById(exerciseId: string) {
    const item = planned.find((exercise) => exercise.id === exerciseId)
    if (item) removeExercise(item)
  }

  function removeExerciseUnit(unit: (typeof exerciseUnitsForBuilder)[number]) {
    if (unit.exercises.length === 1) {
      removeExercise(unit.exercises[0])
      return
    }
    if (!window.confirm(`Remove ${unit.name} and unlink its superset?`)) return
    const ids = new Set(unit.exercises.map((exercise) => exercise.id))
    const next = planned.filter((exercise) => !ids.has(exercise.id))
    setActiveExerciseIndex((current) =>
      current === null ? null : Math.min(current, Math.max(0, next.length - 1)),
    )
    setPlanned(next)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setProblem('')
    if (!name.trim()) {
      setProblem('Give your workout a name.')
      return
    }
    if (planned.length === 0) {
      setProblem('Add at least one exercise.')
      return
    }
    setSaving(true)
    try {
      const endpoint = id ? `templates/${id}` : 'templates'
      const template = await api<Template>(
        coaching ? `coachees/${coaching.journal.owner.id}/${endpoint}` : endpoint,
        {
          name,
          note,
          warmup,
          cooldown,
          exercises: planned.map((item) => ({
            id: item.id,
            note: item.note ?? '',
            supersetId: item.supersetId,
            targets: item.targets.map((target) =>
              item.measurement === 'duration'
                ? {
                    durationSeconds:
                      target.durationSeconds === '' ? null : Number(target.durationSeconds),
                    rpe: target.rpe === '' ? null : Number(target.rpe),
                  }
                : {
                    reps: target.reps === '' ? null : Number(target.reps),
                    weight: target.weight === '' ? null : Number(target.weight),
                    rpe: target.rpe === '' ? null : Number(target.rpe),
                  },
            ),
          })),
        },
      )
      if (!coaching)
        setJournal((current) => ({
          ...current,
          templates: [template, ...current.templates.filter((item) => item.id !== template.id)],
        }))

      saved.current = true
      navigate(returnPath, {
        state: { notice: `"${template.name}" saved. Start it whenever you are ready.` },
      })
    } catch (error) {
      if (coaching && error instanceof ApiError && error.status === 404)
        coaching.onUnavailable(error.message)
      setProblem((error as Error).message)
      setSaving(false)
    }
  }

  if (id && (!original || (!coaching && active))) {
    return (
      <div className={card}>
        <p role="alert" className={errorText}>
          {active
            ? 'Finish or discard your active workout before editing a template.'
            : 'That workout could not be found. Refresh your journal and try again.'}
        </p>
        <button type="button" onClick={() => navigate(returnPath)} className={secondaryButton}>
          Back to workouts
        </button>
      </div>
    )
  }

  const exerciseUnitsForBuilder = exerciseUnits(planned)
  const currentExerciseIndex =
    activeExerciseIndex === null
      ? null
      : Math.min(activeExerciseIndex, Math.max(0, exerciseUnitsForBuilder.length - 1))

  function reorderFromOverview(targetIndex: number) {
    if (draggedExerciseIndex === null || draggedExerciseIndex === targetIndex) {
      setDraggedOverExerciseIndex(null)
      return
    }
    const reordered = moveItem(exerciseUnitsForBuilder, draggedExerciseIndex, targetIndex)
    setPlanned(reordered.flatMap((unit) => unit.exercises))
    setActiveExerciseIndex((current) => {
      if (current === null) return null
      if (current === draggedExerciseIndex) return targetIndex
      if (draggedExerciseIndex < current && targetIndex >= current) return current - 1
      if (draggedExerciseIndex > current && targetIndex <= current) return current + 1
      return current
    })
    setDraggedExerciseIndex(null)
    setDraggedOverExerciseIndex(null)
  }

  function moveOverviewPointer(event: PointerEvent<HTMLDivElement>) {
    if (draggedExerciseIndex === null) return
    event.preventDefault()
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('[data-overview-index]')
      ?.getAttribute('data-overview-index')
    if (target !== null && target !== undefined) setDraggedOverExerciseIndex(Number(target))
  }

  return (
    <form onSubmit={save} noValidate>
      {coaching && (
        <p className="text-accent mb-3 font-normal break-words">
          Coaching {coaching.journal.owner.username}
        </p>
      )}
      <h1 className="gradient-text mb-4 text-3xl font-bold">
        {id ? 'Edit workout' : 'Create workout'}
      </h1>
      {id && (
        <p className="text-muted mb-4">
          Changes apply to future workouts. Completed history stays unchanged.
        </p>
      )}
      <div className={`${card} mb-4 flex flex-col gap-4`}>
        <div>
          <label htmlFor="workout-name" className={label}>
            Workout name
          </label>
          <input
            id="workout-name"
            className={input}
            maxLength={60}
            placeholder="e.g. Push day"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <NoteInput
          label="Workout note"
          maximum={1000}
          value={note}
          onChange={setNote}
          disabled={saving}
        />
        <WorkoutInstructions
          warmup={warmup}
          cooldown={cooldown}
          disabled={saving}
          onChange={(field, value) => (field === 'warmup' ? setWarmup(value) : setCooldown(value))}
        />
        <ExercisePicker
          exercises={journal.exercises}
          plannedIds={planned.map((item) => item.id)}
          favoriteExerciseIds={coaching ? undefined : ownJournal.favoriteExerciseIds}
          onRemoveFavorite={coaching ? undefined : removeFavorite}
          onRemove={removeExerciseById}
          onAdd={add}
          onCreate={
            coaching
              ? undefined
              : (exercise) => {
                  setJournal((current) => ({
                    ...current,
                    exercises: [...current.exercises, exercise],
                  }))
                  add(exercise)
                }
          }
        />
      </div>

      {planned.length === 0 && (
        <p className="border-border text-muted rounded-2xl border border-dashed p-6 text-center">
          Add your first exercise. Each one starts with three sets.
        </p>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {pairNotice}
      </p>
      {exerciseUnitsForBuilder.length > 0 && (
        <div className={`${card} mb-4`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted text-sm">
              {currentExerciseIndex === null
                ? 'All exercises closed'
                : `Exercise ${currentExerciseIndex + 1} of ${exerciseUnitsForBuilder.length}`}
            </p>
            <button
              type="button"
              onClick={() => setActiveExerciseIndex(null)}
              className={`${textButton} min-h-11`}
            >
              Close all
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {exerciseUnitsForBuilder.map((unit, index) => (
              <div
                key={unit.id}
                data-overview-index={index}
                onPointerDown={(event) => {
                  if (event.isPrimary) {
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setDraggedExerciseIndex(index)
                    setDraggedOverExerciseIndex(index)
                  }
                }}
                onPointerMove={moveOverviewPointer}
                onPointerUp={(event) => {
                  if (!event.isPrimary) return
                  reorderFromOverview(draggedOverExerciseIndex ?? index)
                }}
                onPointerCancel={() => {
                  setDraggedExerciseIndex(null)
                  setDraggedOverExerciseIndex(null)
                }}
                className={`flex min-h-11 shrink-0 touch-none items-center rounded-full border ${index === currentExerciseIndex ? 'border-accent text-accent' : 'border-border text-muted'} ${draggedExerciseIndex === index ? 'opacity-50' : ''} ${draggedOverExerciseIndex === index && draggedExerciseIndex !== index ? 'bg-accent/20 border-accent ring-accent ring-2' : ''}`}
              >
                <GripVertical className="ml-2 size-4" aria-hidden />
                <button
                  type="button"
                  aria-label={`Open ${unit.name}`}
                  aria-current={index === currentExerciseIndex ? 'step' : undefined}
                  onClick={() =>
                    setActiveExerciseIndex(index === currentExerciseIndex ? null : index)
                  }
                  className="min-h-11 rounded-full px-3 text-left text-sm"
                >
                  {index + 1}. {unit.name}
                </button>
                {draggedOverExerciseIndex === index && draggedExerciseIndex !== index && (
                  <span className="text-accent pr-3 text-xs font-normal">Drop here</span>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${unit.name} from this workout`}
                  onClick={() => removeExerciseUnit(unit)}
                  className="text-muted hover:text-danger flex size-11 shrink-0 items-center justify-center rounded-full"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <ReorderList
        items={exerciseUnitsForBuilder}
        enabled={!saving}
        onChange={(units) => setPlanned(units.flatMap((unit) => unit.exercises))}
        onPair={(draggedId, targetId) => pair(targetId, draggedId)}
      >
        {(unit, unitIndex) => {
          if (unitIndex !== currentExerciseIndex) {
            return (
              <button
                type="button"
                onClick={() => setActiveExerciseIndex(unitIndex)}
                className="border-border text-muted flex min-h-11 w-full items-center justify-between rounded-lg border px-3 text-left"
              >
                <span className="truncate">
                  {unitIndex + 1}. {unit.name}
                </span>
                <span className="text-accent ml-3 shrink-0 text-sm">Open</span>
              </button>
            )
          }
          return (
            <div
              className={
                unit.exercises.length === 2
                  ? 'border-accent flex flex-col gap-4 border-l-2 pl-3'
                  : ''
              }
            >
              {unit.exercises.length === 2 && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-accent flex items-center gap-2">
                    <Link2 className="size-5" aria-hidden />
                    {
                      supersetLabel(
                        planned,
                        planned.findIndex((exercise) => exercise.id === unit.id),
                      )?.split(' · ')[0]
                    }
                  </p>
                  <button
                    type="button"
                    disabled={saving}
                    className={textButton}
                    onClick={() => {
                      setPlanned(unlinkSuperset(planned, unit.exercises[0].supersetId!))
                      setPairNotice('Superset unlinked. Exercise targets and order are unchanged.')
                    }}
                  >
                    <Unlink className="mr-2 size-4" aria-hidden />
                    Unlink superset
                  </button>
                </div>
              )}
              {unit.exercises.map((item) => (
                <section key={item.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <ExerciseLink id={item.id} name={item.name} measurement={item.measurement} />
                      <p className="text-muted text-sm">{item.group}</p>
                      {item.supersetId && (
                        <p className="text-accent text-base">
                          {supersetLabel(
                            planned,
                            planned.findIndex((exercise) => exercise.id === item.id),
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveExerciseIndex(null)}
                        className="text-muted flex min-h-11 items-center gap-1 rounded-full px-2 text-sm"
                      >
                        <X className="size-4" aria-hidden />
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExercise(item)}
                        aria-label={`Remove ${item.name}`}
                        className="text-muted flex size-11 shrink-0 items-center justify-center rounded-xl"
                      >
                        <Trash2 className="size-5" aria-hidden />
                      </button>
                    </div>
                  </div>
                  {item.source === 'personal' && (
                    <p className="text-muted mt-2">
                      Personal exercise — excluded from weekly volume estimates
                    </p>
                  )}
                  <NoteInput
                    label={`${item.name} exercise note`}
                    maximum={500}
                    value={item.note ?? ''}
                    onChange={(value) =>
                      setPlanned(
                        planned.map((exercise) =>
                          exercise.id === item.id ? { ...exercise, note: value } : exercise,
                        ),
                      )
                    }
                    disabled={saving}
                  />
                  <div
                    className={`text-muted mt-2 grid ${item.measurement === 'duration' ? 'grid-cols-[1.75rem_1fr_1fr_2.75rem]' : 'grid-cols-[1.75rem_1fr_1fr_1fr_2.75rem]'} gap-2 text-xs`}
                    aria-hidden
                  >
                    <span>Set</span>
                    {(item.measurement === 'duration' ? durationTargetFields : targetFields).map(
                      (field) => (
                        <span key={field.key}>{field.label}</span>
                      ),
                    )}
                  </div>
                  {item.targets.map((target, setIndex) => (
                    <div
                      key={setIndex}
                      className={`mt-2 grid ${item.measurement === 'duration' ? 'grid-cols-[1.75rem_1fr_1fr_2.75rem]' : 'grid-cols-[1.75rem_1fr_1fr_1fr_2.75rem]'} items-center gap-2`}
                    >
                      <span className="text-muted text-center font-normal">{setIndex + 1}</span>
                      {(item.measurement === 'duration' ? durationTargetFields : targetFields).map(
                        ({ key, label: fieldLabel, mode }) => (
                          <input
                            key={key}
                            type="text"
                            inputMode={mode}
                            aria-label={`${item.name}, set ${setIndex + 1}, target ${fieldLabel}`}
                            placeholder={
                              key === 'durationSeconds'
                                ? 'seconds'
                                : key === 'reps'
                                  ? 'reps'
                                  : 'opt.'
                            }
                            value={target[key]}
                            onChange={(event) =>
                              changeTargets(
                                item.id,
                                item.targets.map((row, j) =>
                                  j === setIndex
                                    ? { ...row, [key]: event.target.value.replace(',', '.') }
                                    : row,
                                ),
                              )
                            }
                            className={`${input} text-center`}
                          />
                        ),
                      )}
                      <button
                        type="button"
                        disabled={item.targets.length === 1}
                        onClick={() =>
                          changeTargets(
                            item.id,
                            item.targets.filter((_, j) => j !== setIndex),
                          )
                        }
                        aria-label={`Remove set ${setIndex + 1} of ${item.name}`}
                        className="text-muted flex size-11 items-center justify-center rounded-xl disabled:opacity-30"
                      >
                        <X className="size-5" aria-hidden />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={item.targets.length >= 20}
                    onClick={() => changeTargets(item.id, [...item.targets, newTarget()])}
                    className={`${textButton} mt-2`}
                  >
                    + Add set
                  </button>
                  {!item.supersetId &&
                    planned.some((exercise) => exercise.id !== item.id && !exercise.supersetId) && (
                      <details className="mt-2">
                        <summary className="text-accent flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 font-normal">
                          <Link2 className="size-4" aria-hidden />
                          Link as superset
                        </summary>
                        <select
                          value=""
                          disabled={saving}
                          className={`${input} mt-1`}
                          aria-label={`Link ${item.name} as superset`}
                          onChange={(event) => {
                            if (event.target.value) pair(item.id, event.target.value)
                          }}
                        >
                          <option value="">Choose another exercise</option>
                          {planned
                            .filter((exercise) => exercise.id !== item.id && !exercise.supersetId)
                            .map((exercise) => (
                              <option key={exercise.id} value={exercise.id}>
                                {exercise.name}
                              </option>
                            ))}
                        </select>
                      </details>
                    )}
                </section>
              ))}
            </div>
          )
        }}
      </ReorderList>

      <p className="text-muted mt-4 text-sm">
        Reps or seconds are required. Weight (for repetition exercises) and RPE (1–10, steps of 0.5)
        are optional.
      </p>

      <div className="border-border bg-ink/95 sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-4 flex flex-col gap-2 rounded-2xl border p-3 backdrop-blur md:bottom-4">
        {problem && (
          <p role="alert" className={errorText}>
            {problem}
          </p>
        )}
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button type="button" onClick={() => navigate(returnPath)} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            <Check className="size-5" aria-hidden />
            {saving ? 'Saving…' : id ? 'Save changes' : 'Save workout'}
          </button>
        </div>
      </div>
    </form>
  )
}

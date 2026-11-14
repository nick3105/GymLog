import { Check, Link2, Unlink, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'

import { api } from '../api'
import ExerciseLink from '../components/ExerciseLink'
import ExercisePicker from '../components/ExercisePicker'
import ReorderList from '../components/ReorderList'
import WorkoutInstructions from '../components/WorkoutInstructions'
import { exerciseUnits, linkExercises, unlinkSuperset, supersetLabel } from '../supersets'
import { newId } from '../newId'
import { useJournal } from '../journal'
import { targetsFor } from '../targets'
import type { Exercise, Template } from '../types'
import { card, errorText, input, label, primaryButton, secondaryButton, textButton } from '../ui'

type TargetInput = { reps: string; weight: string; rpe: string; durationSeconds: string }
type Planned = Exercise & { supersetId?: string; targets: TargetInput[] }

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
export default function Create() {
  const { journal, setJournal, setBuilderDirty, active } = useJournal()
  const navigate = useNavigate()
  const { id } = useParams()
  const original = journal.templates.find((template) => template.id === id)
  const [name, setName] = useState(original?.name ?? '')
  const [warmup, setWarmup] = useState(original?.warmup ?? '')
  const [cooldown, setCooldown] = useState(original?.cooldown ?? '')
  const [pairNotice, setPairNotice] = useState('')
  const [planned, setPlanned] = useState<Planned[]>(
    () =>
      original?.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
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
  const dirty = name.trim() !== '' || planned.length > 0 || warmup !== '' || cooldown !== ''

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
    setPlanned([...planned, { ...exercise, targets: [newTarget(), newTarget(), newTarget()] }])
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
    setPlanned(unpaired.filter((exercise) => exercise.id !== item.id))
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
      const template = await api<Template>(id ? `templates/${id}` : 'templates', {
        name,
        warmup,
        cooldown,
        exercises: planned.map((item) => ({
          id: item.id,
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
      })
      setJournal((current) => ({
        ...current,
        templates: [template, ...current.templates.filter((item) => item.id !== template.id)],
      }))
      saved.current = true
      navigate('/start', {
        state: { notice: `"${template.name}" saved. Start it whenever you are ready.` },
      })
    } catch (error) {
      setProblem((error as Error).message)
      setSaving(false)
    }
  }

  if (id && (!original || active)) {
    return (
      <div className={card}>
        <p role="alert" className={errorText}>
          {active
            ? 'Finish or discard your active workout before editing a template.'
            : 'That workout could not be found. Refresh your journal and try again.'}
        </p>
        <button type="button" onClick={() => navigate('/start')} className={secondaryButton}>
          Back to workouts
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={save} noValidate>
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
        <WorkoutInstructions
          warmup={warmup}
          cooldown={cooldown}
          disabled={saving}
          onChange={(field, value) => (field === 'warmup' ? setWarmup(value) : setCooldown(value))}
        />
        <ExercisePicker
          exercises={journal.exercises}
          plannedIds={planned.map((item) => item.id)}
          onAdd={add}
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
      <ReorderList
        items={exerciseUnits(planned)}
        enabled={!saving}
        onChange={(units) => setPlanned(units.flatMap((unit) => unit.exercises))}
        onPair={(draggedId, targetId) => pair(targetId, draggedId)}
      >
        {(unit) => (
          <div
            className={
              unit.exercises.length === 2 ? 'border-accent flex flex-col gap-4 border-l-2 pl-3' : ''
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
                    <ExerciseLink id={item.id} name={item.name} />
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
                  <button
                    type="button"
                    onClick={() => removeExercise(item)}
                    aria-label={`Remove ${item.name}`}
                    className="text-muted flex size-11 shrink-0 items-center justify-center rounded-xl"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </button>
                </div>
                {!item.supersetId &&
                  planned.some((exercise) => exercise.id !== item.id && !exercise.supersetId) && (
                    <label className="mt-3 block text-base">
                      Link as superset
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
                    </label>
                  )}
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
                            key === 'durationSeconds' ? 'seconds' : key === 'reps' ? 'reps' : 'opt.'
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
              </section>
            ))}
          </div>
        )}
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
          <button type="button" onClick={() => navigate('/start')} className={secondaryButton}>
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

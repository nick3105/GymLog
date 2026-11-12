import { Check, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'

import { api } from '../api'
import ExerciseLink from '../components/ExerciseLink'
import ExercisePicker from '../components/ExercisePicker'
import ReorderList from '../components/ReorderList'
import { useJournal } from '../journal'
import { targetsFor } from '../targets'
import type { Exercise, Template } from '../types'
import { card, errorText, input, label, primaryButton, secondaryButton, textButton } from '../ui'

type TargetInput = { reps: string; weight: string; rpe: string }
type Planned = Exercise & { targets: TargetInput[] }

const newTarget = (): TargetInput => ({ reps: '8', weight: '', rpe: '' })

const targetFields: { key: keyof TargetInput; label: string; mode: 'decimal' | 'numeric' }[] = [
  { key: 'reps', label: 'Reps', mode: 'numeric' },
  { key: 'weight', label: 'kg', mode: 'decimal' },
  { key: 'rpe', label: 'RPE', mode: 'decimal' },
]

// PLN-01 to PLN-11: plan a workout once, with targets for every set.
export default function Create() {
  const { journal, setJournal, setBuilderDirty, active } = useJournal()
  const navigate = useNavigate()
  const { id } = useParams()
  const original = journal.templates.find((template) => template.id === id)
  const [name, setName] = useState(original?.name ?? '')
  const [planned, setPlanned] = useState<Planned[]>(
    () =>
      original?.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        group: journal.exercises.find((item) => item.id === exercise.id)?.group ?? '',
        targets: targetsFor(exercise).map((target) => ({
          reps: String(target.reps),
          weight: target.weight === null ? '' : String(target.weight),
          rpe: target.rpe === null ? '' : String(target.rpe),
        })),
      })) ?? [],
  )
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const saved = useRef(false)
  const dirty = name.trim() !== '' || planned.length > 0

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

  function changeTargets(index: number, targets: TargetInput[]) {
    setPlanned(planned.map((item, i) => (i === index ? { ...item, targets } : item)))
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
        exercises: planned.map((item) => ({
          id: item.id,
          targets: item.targets.map((target) => ({
            reps: target.reps === '' ? null : Number(target.reps),
            weight: target.weight === '' ? null : Number(target.weight),
            rpe: target.rpe === '' ? null : Number(target.rpe),
          })),
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

      <ReorderList items={planned} enabled={!saving} onChange={setPlanned}>
        {(item, index) => (
          <section key={item.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <ExerciseLink id={item.id} name={item.name} />
                <p className="text-muted text-sm">{item.group}</p>
              </div>
              <button
                type="button"
                onClick={() => setPlanned(planned.filter((_, i) => i !== index))}
                aria-label={`Remove ${item.name}`}
                className="text-muted flex size-11 shrink-0 items-center justify-center rounded-xl"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            </div>
            <div
              className="text-muted mt-2 grid grid-cols-[1.75rem_1fr_1fr_1fr_2.75rem] gap-2 text-xs"
              aria-hidden
            >
              <span>Set</span>
              <span>Reps</span>
              <span>kg</span>
              <span>RPE</span>
            </div>
            {item.targets.map((target, setIndex) => (
              <div
                key={setIndex}
                className="mt-2 grid grid-cols-[1.75rem_1fr_1fr_1fr_2.75rem] items-center gap-2"
              >
                <span className="text-muted text-center font-normal">{setIndex + 1}</span>
                {targetFields.map(({ key, label: fieldLabel, mode }) => (
                  <input
                    key={key}
                    type="text"
                    inputMode={mode}
                    aria-label={`${item.name}, set ${setIndex + 1}, target ${fieldLabel}`}
                    placeholder={key === 'reps' ? 'reps' : 'opt.'}
                    value={target[key]}
                    onChange={(event) =>
                      changeTargets(
                        index,
                        item.targets.map((row, j) =>
                          j === setIndex
                            ? { ...row, [key]: event.target.value.replace(',', '.') }
                            : row,
                        ),
                      )
                    }
                    className={`${input} text-center`}
                  />
                ))}
                <button
                  type="button"
                  disabled={item.targets.length === 1}
                  onClick={() =>
                    changeTargets(
                      index,
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
              onClick={() => changeTargets(index, [...item.targets, newTarget()])}
              className={`${textButton} mt-2`}
            >
              + Add set
            </button>
          </section>
        )}
      </ReorderList>

      <p className="text-muted mt-4 text-sm">
        Reps are required. Weight and RPE (1–10, steps of 0.5) are optional.
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

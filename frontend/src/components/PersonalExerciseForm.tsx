import { useEffect, useState } from 'react'

import { api } from '../api'
import { newId } from '../newId'
import type { Exercise } from '../types'
import { errorText, input, secondaryButton } from '../ui'

type Props = {
  exercises: Exercise[]
  initialName: string
  onCreated: (exercise: Exercise) => void
  onCancel: () => void
}

export default function PersonalExerciseForm({
  exercises,
  initialName,
  onCreated,
  onCancel,
}: Props) {
  const [requestId] = useState(newId)
  const [name, setName] = useState(initialName)
  const [primaryMuscle, setPrimaryMuscle] = useState('none')
  const [muscles, setMuscles] = useState<{ id: string; label: string }[]>([])
  const [measurement, setMeasurement] = useState('repetitions')
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let current = true
    api<{ muscles: { id: string; label: string }[] }>('exercises/personal/muscles')
      .then((result) => current && setMuscles(result.muscles))
      .catch((error: Error) => current && setProblem(error.message))
    return () => {
      current = false
    }
  }, [])

  async function save() {
    if (saving) return
    if (
      exercises.some(
        (exercise) =>
          exercise.source !== 'personal' &&
          exercise.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
      ) &&
      !window.confirm('A shared exercise has this name. Create your personal variant?')
    )
      return
    setSaving(true)
    setProblem('')
    try {
      const exercise = await api<Exercise>('exercises/personal', {
        requestId,
        name,
        primaryMuscle,
        measurement,
      })
      onCreated(exercise)
    } catch (error) {
      setProblem((error as Error).message)
      setSaving(false)
    }
  }

  return (
    <div
      role="group"
      aria-label="Create personal exercise"
      className="border-border mt-3 rounded-lg border p-3"
    >
      <p className="mb-3">
        {primaryMuscle === 'none'
          ? 'This exercise will not count towards volume.'
          : measurement === 'duration'
            ? 'Timed holds do not count towards weekly volume. Body load shows their seconds.'
            : 'Each completed set counts as 1 for your selected muscle, with no indirect contribution.'}
      </p>
      <label className="mb-3 block">
        Exercise name
        <input
          aria-label="Personal exercise name"
          value={name}
          onChange={(event) => setName(Array.from(event.target.value).slice(0, 80).join(''))}
          className={input}
          disabled={saving}
        />
      </label>
      <label className="mb-3 block">
        Primary muscle
        <select
          value={primaryMuscle}
          onChange={(event) => setPrimaryMuscle(event.target.value)}
          className={input}
          disabled={saving || muscles.length === 0}
        >
          {muscles.length === 0 && <option value="none">Loading muscle groups...</option>}
          {muscles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-3 block">
        Measurement
        <select
          value={measurement}
          onChange={(event) => setMeasurement(event.target.value)}
          className={input}
          disabled={saving}
        >
          <option value="repetitions">Repetitions</option>
          <option value="duration">Seconds</option>
        </select>
      </label>
      {problem && (
        <p role="alert" className={errorText}>
          {problem}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || muscles.length === 0}
          className={secondaryButton}
        >
          {saving ? 'Creating…' : 'Create & add exercise'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </div>
  )
}

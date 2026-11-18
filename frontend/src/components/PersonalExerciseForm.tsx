import { useState } from 'react'

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
  const [group, setGroup] = useState('Core')
  const [measurement, setMeasurement] = useState('repetitions')
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const groups = [...new Set(exercises.map((exercise) => exercise.group))]

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
        group,
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
      <p className="mb-3">Personal exercise — excluded from weekly volume estimates</p>
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
        Muscle group
        <select
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          className={input}
          disabled={saving}
        >
          {groups.map((item) => (
            <option key={item}>{item}</option>
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
        <button type="button" onClick={save} disabled={saving} className={secondaryButton}>
          {saving ? 'Creating…' : 'Create & add exercise'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </div>
  )
}

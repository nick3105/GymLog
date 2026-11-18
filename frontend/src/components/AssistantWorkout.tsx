import { useEffect, useRef, useState } from 'react'

import { api } from '../api'
import type { SuggestedWorkout } from '../assistant'
import { formatNumber } from '../format'
import { useJournal } from '../journal'
import { targetsFor } from '../targets'
import type { Template } from '../types'
import { card, secondaryButton } from '../ui'

export default function AssistantWorkout({ workout }: { workout: SuggestedWorkout }) {
  const { setJournal } = useJournal()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [problem, setProblem] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function save() {
    if (saving || saved) return
    setSaving(true)
    setProblem('')
    try {
      const template = await api<Template>('templates', workout)
      if (!mounted.current) return
      setJournal((journal) => ({ ...journal, templates: [template, ...journal.templates] }))
      setSaved(true)
    } catch (error) {
      if (mounted.current) setProblem((error as Error).message)
    } finally {
      if (mounted.current) setSaving(false)
    }
  }

  return (
    <section className={`${card} flex min-w-0 flex-col gap-3`}>
      <h3 className="font-normal wrap-anywhere">{workout.name}</h3>
      <ul className="flex flex-col gap-3">
        {workout.exercises.map((exercise) => (
          <li key={exercise.id} className="wrap-anywhere">
            <p>{exercise.name}</p>
            <p className="text-label">
              {targetsFor(exercise)
                .map(
                  (target, index) =>
                    `${index + 1}: ${target.durationSeconds !== undefined ? `${target.durationSeconds}s` : `${target.reps} reps`}${target.rpe === null ? '' : ` · RPE ${formatNumber(target.rpe)}`}`,
                )
                .join(' / ')}
            </p>
          </li>
        ))}
      </ul>
      <button type="button" onClick={save} disabled={saving || saved} className={secondaryButton}>
        {saved ? 'Saved to Start' : saving ? 'Saving…' : 'Save workout'}
      </button>
      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
    </section>
  )
}

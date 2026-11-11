import { Play } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import EmptyState from '../components/EmptyState'
import Notice from '../components/Notice'
import { today } from '../format'
import { useJournal } from '../journal'
import { newId } from '../newId'
import { targetsFor } from '../targets'
import type { Template } from '../types'
import { card, secondaryButton, textButton } from '../ui'

// RUN-01 and RUN-02: pick a saved workout and start it.
export default function Start() {
  const { journal, active, setActive } = useJournal()
  const navigate = useNavigate()

  function start(template: Template) {
    if (active && !window.confirm(`Replace your unfinished "${active.name}" with a new workout?`))
      return
    setActive({
      clientId: newId(),
      templateId: template.id,
      name: template.name,
      day: today(),
      exercises: template.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        targets: targetsFor(exercise),
        sets: Array.from({ length: exercise.sets }, () => ({ weight: '', reps: '', rpe: '' })),
      })),
    })
    navigate('/session')
  }

  return (
    <>
      <Notice />
      <div className="mb-4 flex items-end justify-between gap-2">
        <h1 className="gradient-text text-3xl font-bold">Start workout</h1>
        <Link to="/create" className={textButton}>
          + New
        </Link>
      </div>
      {journal.templates.length === 0 ? (
        <EmptyState
          title="Your routine starts here."
          text="Create your first workout, then come back here to start it."
          to="/create"
          action="Create workout"
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {journal.templates.map((template) => (
            <li key={template.id} className={card}>
              <h2 className="text-xl font-normal">{template.name}</h2>
              <p className="text-muted mb-2 text-sm">
                {template.exercises.length} exercises ·{' '}
                {template.exercises.reduce((total, exercise) => total + exercise.sets, 0)} sets
              </p>
              <ul className="mb-3 text-sm">
                {template.exercises.map((exercise) => (
                  <li key={exercise.id} className="flex justify-between gap-2 py-0.5">
                    <span className="truncate">{exercise.name}</span>
                    <span className="text-muted shrink-0">{exercise.sets} sets</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => start(template)}
                className="gradient-border text-accent inline-flex h-12 w-full items-center justify-center gap-2 rounded-full font-normal"
              >
                <Play className="size-5" aria-hidden />
                Start
              </button>
              <Link
                to={`/workouts/${template.id}/edit`}
                className={`${secondaryButton} mt-2 w-full`}
                aria-label={`Edit ${template.name}`}
              >
                Edit workout
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

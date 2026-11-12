import { Play, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import EmptyState from '../components/EmptyState'
import DeleteWorkoutDialog from '../components/DeleteWorkoutDialog'
import { api, ApiError } from '../api'
import Notice from '../components/Notice'
import { today } from '../format'
import { useJournal } from '../journal'
import { newId } from '../newId'
import { targetsFor } from '../targets'
import type { Template } from '../types'
import { card, secondaryButton, textButton } from '../ui'

// RUN-01 and RUN-02: pick a saved workout and start it.
export default function Start() {
  const { journal, active, setActive, setJournal } = useJournal()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState<Template | null>(null)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')
  const trashButton = useRef<HTMLButtonElement | null>(null)

  function cancelDeletion() {
    setDeleting(null)
    requestAnimationFrame(() => trashButton.current?.focus())
  }

  async function remove() {
    if (!deleting || saving) return
    setSaving(true)
    setProblem('')
    try {
      await api(`templates/${deleting.id}/delete`, {})
      setJournal((current) => ({
        ...current,
        templates: current.templates.filter((item) => item.id !== deleting.id),
      }))
      setNotice(`“${deleting.name}” deleted. Completed workouts remain in your history.`)
      setDeleting(null)
    } catch (error) {
      // A retry may find that an earlier request already deleted the routine.
      if (error instanceof ApiError && error.status === 404) {
        setJournal((current) => ({
          ...current,
          templates: current.templates.filter((item) => item.id !== deleting.id),
        }))
        setNotice(
          'That workout is no longer in your saved workouts. Completed history is unchanged.',
        )
        setDeleting(null)
      } else setProblem((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

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
      {notice && (
        <p role="status" className="text-muted mb-4">
          {notice}
        </p>
      )}
      {deleting && (
        <DeleteWorkoutDialog
          name={deleting.name}
          saving={saving}
          problem={problem}
          onCancel={cancelDeletion}
          onConfirm={remove}
        />
      )}
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
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 flex-1 text-xl font-normal break-words">{template.name}</h2>
                <button
                  type="button"
                  aria-label={`Delete ${template.name}`}
                  disabled={active?.templateId === template.id}
                  title={
                    active?.templateId === template.id
                      ? 'Finish or discard this active workout before deleting its template.'
                      : 'Delete workout'
                  }
                  onClick={(event) => {
                    trashButton.current = event.currentTarget
                    setProblem('')
                    setDeleting(template)
                  }}
                  className="text-muted hover:text-danger focus-visible:text-danger flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </div>
              {active?.templateId === template.id && (
                <p className="text-muted mb-2 text-sm">
                  Finish or discard your active workout before deleting this template.
                </p>
              )}
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

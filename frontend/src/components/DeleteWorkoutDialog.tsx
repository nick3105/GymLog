import { useEffect, useRef } from 'react'

import { errorText, secondaryButton } from '../ui'

type Props = {
  name: string
  saving: boolean
  problem: string
  onCancel: () => void
  onConfirm: () => void
}

// A native modal traps focus, supports Escape and returns focus to the trash button.
export default function DeleteWorkoutDialog({ name, saving, problem, onCancel, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => element?.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-workout-title"
      aria-describedby="delete-workout-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onCancel()
      }}
      className="border-border bg-panel text-text fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border p-5 shadow-2xl backdrop:bg-black/70"
    >
      <h2 id="delete-workout-title" className="text-xl font-semibold">
        Delete workout?
      </h2>
      <p id="delete-workout-description" className="mt-3 break-words">
        Are you sure you want to delete “{name}”? Completed workouts will stay in your history.
      </p>
      {problem && (
        <p role="alert" className={`${errorText} mt-3`}>
          {problem}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2">
        <button
          ref={cancel}
          type="button"
          disabled={saving}
          onClick={onCancel}
          className={secondaryButton}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onConfirm}
          className="border-danger text-danger inline-flex min-h-12 items-center justify-center rounded-xl border px-4 font-semibold disabled:opacity-40"
        >
          {saving ? 'Deleting…' : 'Delete workout'}
        </button>
      </div>
    </dialog>
  )
}

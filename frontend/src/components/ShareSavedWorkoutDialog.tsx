import { useEffect, useRef, useState, type FormEvent } from 'react'

import { api } from '../api'
import {
  audienceFromAccess,
  type WorkoutAudienceSelection,
  type WorkoutSharing as SharingState,
} from '../friends'
import { errorText, primaryButton, secondaryButton } from '../ui'
import WorkoutAudience from './WorkoutAudience'

export default function ShareSavedWorkoutDialog({
  sessionId,
  afterSave,
  onDone,
}: {
  sessionId: string
  afterSave: boolean
  onDone: (notice?: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const dismissButton = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState<WorkoutAudienceSelection | null>(
    afterSave ? { audience: 'all' } : null,
  )
  const [currentIds, setCurrentIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const canShare =
    selection &&
    (!afterSave ||
      selection.audience === 'all' ||
      (selection.audience === 'selected' && selection.friendshipIds.length > 0))

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    dismissButton.current?.focus()
    return () => element?.close()
  }, [])

  useEffect(() => {
    if (afterSave) return
    let current = true
    api<SharingState>(`sessions/${sessionId}/shares`)
      .then((access) => {
        if (current) {
          setCurrentIds(access.shares.map((share) => share.friendshipId))
          setSelection(
            access.shares.length === 0 ? { audience: 'private' } : audienceFromAccess(access),
          )
        }
      })
      .catch((error: Error) => {
        if (current) setProblem(error.message)
      })
    return () => {
      current = false
    }
  }, [afterSave, sessionId])

  function dismiss() {
    onDone(
      afterSave
        ? problem
          ? 'Workout saved. Open Share workout to review access.'
          : 'Workout saved privately.'
        : undefined,
    )
  }

  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !canShare) return
    setBusy(true)
    setProblem('')
    try {
      const audience =
        selection.audience === 'private' ? { audience: 'selected', friendshipIds: [] } : selection
      const { recipientCount } = await api<{ recipientCount: number }>(
        `sessions/${sessionId}/shares`,
        { ...audience, replace: !afterSave },
      )
      onDone(
        !afterSave
          ? recipientCount === 0
            ? 'Workout kept private.'
            : 'Workout access updated.'
          : recipientCount === 0
            ? 'You have no accepted friends to share with yet.'
            : 'Workout saved and shared.',
      )
    } catch (error) {
      setProblem((error as Error).message)
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="share-saved-workout-title"
      aria-describedby="share-saved-workout-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) dismiss()
      }}
      className="border-border bg-panel text-text fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-lg p-5 shadow-2xl backdrop:bg-black/70"
    >
      <h2 id="share-saved-workout-title" className="text-xl font-normal">
        Share this workout?
      </h2>
      <p id="share-saved-workout-description" className="text-muted mt-2">
        {afterSave
          ? 'Friends you share with can see the workout name, date, exercises and completed sets.'
          : 'Choose who can see this workout. Keep it private removes all existing shares when you save.'}
      </p>
      <form className="mt-4 flex flex-col gap-3" onSubmit={share}>
        {selection && (
          <WorkoutAudience
            selection={selection}
            onChange={setSelection}
            disabled={busy}
            currentIds={currentIds}
            allowPrivate={!afterSave}
          />
        )}
        {!selection && !problem && <p role="status">Loading workout access…</p>}
        {problem && (
          <p role="alert" className={errorText}>
            {problem}
          </p>
        )}
        {selection && (
          <button type="submit" disabled={!canShare || busy} className={primaryButton}>
            {busy ? 'Saving…' : afterSave ? 'Share workout' : 'Save & close'}
          </button>
        )}
        <button
          ref={dismissButton}
          type="button"
          disabled={busy}
          className={secondaryButton}
          onClick={dismiss}
        >
          {afterSave ? (problem ? 'Close' : 'Keep private') : 'Cancel'}
        </button>
      </form>
    </dialog>
  )
}

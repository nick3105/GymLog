import { useEffect, useRef, useState, type FormEvent } from 'react'

import { api } from '../api'
import type { WorkoutAudienceSelection } from '../friends'
import { errorText, primaryButton, secondaryButton } from '../ui'
import WorkoutAudience from './WorkoutAudience'

export default function ShareGoalMilestone({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const dismissButton = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState<WorkoutAudienceSelection>({ audience: 'all' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const canShare =
    selection.audience === 'all' ||
    (selection.audience === 'selected' && selection.friendshipIds.length > 0)

  useEffect(() => {
    if (!open) return
    const element = dialog.current
    element?.showModal()
    dismissButton.current?.focus()
    return () => element?.close()
  }, [open])

  function dismiss() {
    setOpen(false)
    setProblem('')
    setSelection({ audience: 'all' })
  }

  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !canShare) return
    setBusy(true)
    setProblem('')
    setNotice('')
    try {
      await api('weight-goal/milestone', selection)
      setNotice('Milestone shared with your selected audience.')
      dismiss()
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        className={secondaryButton}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Share milestone
      </button>
      {open && (
        <dialog
          ref={dialog}
          aria-labelledby="share-milestone-title"
          aria-describedby="share-milestone-description"
          onCancel={(event) => {
            event.preventDefault()
            if (!busy) dismiss()
          }}
          className="border-border bg-panel text-text fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-lg p-5 shadow-2xl backdrop:bg-black/70"
        >
          <h2 id="share-milestone-title" className="text-xl font-normal">
            Goal reached! Share this milestone?
          </h2>
          <p id="share-milestone-description" className="text-muted mt-2">
            Friends will only see that you reached a personal goal.
          </p>
          <form onSubmit={share} className="mt-4 flex flex-col gap-3">
            <WorkoutAudience
              selection={selection}
              onChange={setSelection}
              disabled={busy}
              currentIds={[]}
              label="Who can see this milestone?"
            />
            {problem && (
              <p role="alert" className={errorText}>
                {problem}
              </p>
            )}
            <button type="submit" className={primaryButton} disabled={busy || !canShare}>
              {busy ? 'Sharing…' : 'Confirm share'}
            </button>
            <button
              ref={dismissButton}
              type="button"
              className={secondaryButton}
              disabled={busy}
              onClick={dismiss}
            >
              {notice || problem ? 'Close' : 'Keep private'}
            </button>
          </form>
        </dialog>
      )}
      {notice && (
        <p role="status" className="mt-2">
          {notice}
        </p>
      )}
    </div>
  )
}

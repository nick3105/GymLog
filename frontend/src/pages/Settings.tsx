import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { api } from '../api'
import type { CoachingState } from '../coaching'
import { card, errorText, input, label, primaryButton, secondaryButton } from '../ui'

export default function Settings() {
  const [state, setState] = useState<CoachingState | null>(null)
  const [username, setUsername] = useState('')
  const [consent, setConsent] = useState(false)
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)

  async function refresh() {
    setState(await api<CoachingState>('coaching'))
    window.dispatchEvent(new Event('gymlog-coaching-changed'))
  }

  useEffect(() => {
    let current = true
    api<CoachingState>('coaching')
      .then((result) => current && setState(result))
      .catch((error: Error) => current && setProblem(error.message))
    return () => {
      current = false
    }
  }, [])

  async function assign(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setProblem('')
    try {
      await api('coaching/request', { username, consent })
      setUsername('')
      setConsent(false)
      await refresh()
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function change(id: string, action: string) {
    if (
      action === 'revoke' &&
      !window.confirm(
        'End this coaching relationship? Saved plans and history stay with the coachee.',
      )
    )
      return
    setSaving(true)
    setProblem('')
    try {
      await api(`coaching/${id}/${action}`, {})
      await refresh()
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const outgoing = state?.relationships.find((item) => item.coachee_id === state.userId)
  const incoming = state?.relationships.filter((item) => item.coach_id === state.userId) ?? []

  return (
    <div className="flex flex-col gap-4">
      <h1 className="gradient-text text-3xl font-bold">Settings</h1>
      {problem && (
        <p role="alert" className={errorText}>
          {problem}
        </p>
      )}
      {!state && !problem && <p>Loading relationships…</p>}
      <section className={card}>
        <h2 className="mb-3 text-xl font-normal">Your coach</h2>
        {outgoing ? (
          <>
            <p className="mb-3">
              {outgoing.coach} ·{' '}
              {outgoing.state === 'pending' ? 'Awaiting acceptance' : 'Coach assigned'}
            </p>
            <button
              disabled={saving}
              className={secondaryButton}
              onClick={() =>
                change(outgoing.id, outgoing.state === 'pending' ? 'cancel' : 'revoke')
              }
            >
              {outgoing.state === 'pending' ? 'Cancel request' : 'End relationship'}
            </button>
          </>
        ) : (
          <form onSubmit={assign} className="flex flex-col gap-3">
            <label className={label} htmlFor="coach-username">
              Assign coach by username
            </label>
            <input
              id="coach-username"
              value={username}
              maxLength={30}
              onChange={(event) => setUsername(event.target.value)}
              className={input}
              autoComplete="off"
            />
            <p className="text-muted">
              After accepting, your coach can read your existing and future saved workout plans,
              training history, exercise progress and notes. They can create plans and edit plans
              they created for you. Access lasts until either of you ends the relationship.
            </p>
            <label className="flex min-h-11 items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 size-5 shrink-0"
              />
              <span>I agree to share my saved workouts and notes with this coach.</span>
            </label>
            <button
              disabled={!state || saving || !consent || !username.trim()}
              className={primaryButton}
            >
              {saving ? 'Sending…' : 'Assign coach'}
            </button>
          </form>
        )}
      </section>
      <section className={card}>
        <h2 className="mb-3 text-xl font-normal">Coaching requests and coachees</h2>
        {incoming.length === 0 && (
          <p className="text-muted">No coaching requests or coachees yet.</p>
        )}
        {incoming.map((relationship) => (
          <div key={relationship.id} className="border-border border-t py-3">
            <p className="mb-3 break-words">
              {relationship.coachee} ·{' '}
              {relationship.state === 'pending' ? 'Requests your coaching' : 'Accepted coachee'}
            </p>
            {relationship.state === 'pending' ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={saving}
                  onClick={() => change(relationship.id, 'accept')}
                  className={secondaryButton}
                >
                  Accept
                </button>
                <button
                  disabled={saving}
                  onClick={() => change(relationship.id, 'decline')}
                  className={secondaryButton}
                >
                  Decline
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link to={`/coachees/${relationship.coachee_id}`} className={secondaryButton}>
                  Open coachee
                </Link>
                <button
                  disabled={saving}
                  onClick={() => change(relationship.id, 'revoke')}
                  className={secondaryButton}
                >
                  End relationship
                </button>
              </div>
            )}
          </div>
        ))}
      </section>
      <Link to="/coachees" className={secondaryButton}>
        View coachees
      </Link>
    </div>
  )
}

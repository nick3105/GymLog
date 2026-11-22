import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router'

import { api } from '../api'
import type { FriendsState } from '../friends'
import { card, errorText, input, secondaryButton } from '../ui'
import FriendsActivity from '../components/FriendsActivity'
import GoalMilestones from '../components/GoalMilestones'

export default function Friends() {
  const [params] = useSearchParams()
  const selectedId = params.get('sharedWorkout')
  const [state, setState] = useState<FriendsState | null>(null)
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    api<FriendsState>('friends')
      .then((data) => {
        if (active) setState(data)
      })
      .catch((error: Error) => {
        if (active) setProblem(error.message)
      })
    return () => {
      active = false
    }
  }, [selectedId])

  async function update(path: string, body: object, message: string) {
    setBusy(true)
    setProblem('')
    setNotice('')
    try {
      await api(path, body)
      setNotice(message)
      setState(await api<FriendsState>('friends'))
      return true
    } catch (error) {
      setProblem((error as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await update('friends/request', { username }, 'Friend request saved.')) setUsername('')
  }

  if (selectedId) {
    return <FriendsActivity key={selectedId} activity={[]} selectedId={selectedId} />
  }

  const friends = state?.relationships.filter((entry) => entry.state === 'accepted') ?? []
  const pending = state?.relationships.filter((entry) => entry.state === 'pending') ?? []

  return (
    <>
      <h1 className="gradient-text mb-4 text-3xl font-bold">Friends</h1>
      {state && (
        <details className={`${card} mb-4 py-0`}>
          <summary className="min-h-11 cursor-pointer content-center font-normal">
            {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
          </summary>
          {friends.length === 0 && (
            <p className="text-muted pb-3">Your friends will appear here.</p>
          )}
          <ul className="divide-border divide-y">
            {friends.map((relationship) => (
              <li
                key={relationship.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="min-w-0 font-normal wrap-break-word">{relationship.username}</span>
                <button
                  type="button"
                  className={`${secondaryButton} self-start`}
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ${relationship.username} and end mutual workout sharing?`,
                      )
                    ) {
                      void update(`friends/${relationship.id}/end`, {}, 'Friend removed.')
                    }
                  }}
                >
                  Remove friend
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <section className={`${card} mb-4`}>
        <h2 className="mb-2 text-xl font-normal">Friend requests</h2>
        <form onSubmit={send} className="flex flex-col gap-2">
          <label htmlFor="friend-username" className="font-normal">
            GymLog username
          </label>
          <input
            id="friend-username"
            className={input}
            autoCapitalize="none"
            autoComplete="off"
            maxLength={30}
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <button disabled={busy} className={`${secondaryButton} self-start`}>
            Send friend request
          </button>
        </form>
        {problem && (
          <p role="alert" className={`${errorText} mt-2`}>
            {problem}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-2">
            {notice}
          </p>
        )}
        {!state && !problem && <p className="text-muted mt-2">Loading friends…</p>}
        {state && pending.length === 0 && <p className="text-muted mt-3">No pending requests.</p>}
        <ul className="divide-border mt-2 divide-y">
          {pending.map((relationship) => (
            <li key={relationship.id} className="flex flex-col gap-2 py-3">
              <p className="font-normal wrap-break-word">{relationship.username}</p>
              {relationship.incoming ? (
                <>
                  <p className="text-muted">Incoming request</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className={secondaryButton}
                      onClick={() =>
                        void update(`friends/${relationship.id}/accept`, {}, 'Friend added.')
                      }
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={secondaryButton}
                      onClick={() =>
                        void update(`friends/${relationship.id}/decline`, {}, 'Request declined.')
                      }
                    >
                      Decline
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-muted">Request sent</p>
              )}
            </li>
          ))}
        </ul>
      </section>
      {state && (
        <>
          <GoalMilestones
            milestones={state.milestones ?? []}
            congratulations={state.congratulations ?? []}
          />
          <FriendsActivity activity={state.activity} selectedId={null} />
        </>
      )}
    </>
  )
}

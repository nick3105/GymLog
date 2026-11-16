import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { api } from '../api'
import type { CoachingState } from '../coaching'
import { card, errorText, secondaryButton } from '../ui'

export default function Coachees() {
  const [state, setState] = useState<CoachingState | null>(null)
  const [problem, setProblem] = useState('')
  useEffect(() => {
    let current = true
    api<CoachingState>('coaching')
      .then((result) => current && setState(result))
      .catch((error: Error) => current && setProblem(error.message))
    return () => {
      current = false
    }
  }, [])
  const coachees =
    state?.relationships.filter(
      (item) => item.coach_id === state.userId && item.state === 'accepted',
    ) ?? []
  return (
    <div className="flex flex-col gap-4">
      <h1 className="gradient-text text-3xl font-bold">Coachees</h1>
      {problem && (
        <p role="alert" className={errorText}>
          {problem}
        </p>
      )}
      {!state && !problem && <p>Loading coachees…</p>}
      {state && coachees.length === 0 && (
        <p className={card}>Accepted coachees appear here. Manage requests in Settings.</p>
      )}
      {coachees.map((item) => (
        <Link
          key={item.id}
          to={`/coachees/${item.coachee_id}`}
          className={`${card} block min-h-14 font-normal break-words`}
        >
          {item.coachee}
        </Link>
      ))}
      <Link to="/settings" className={secondaryButton}>
        Manage coaching relationships
      </Link>
    </div>
  )
}

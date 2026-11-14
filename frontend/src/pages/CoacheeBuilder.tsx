import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { api } from '../api'
import type { CoacheeJournal } from '../coaching'
import { errorText, secondaryButton } from '../ui'
import Create from './Create'

export default function CoacheeBuilder() {
  const { coacheeId, id } = useParams()
  const [loadedJournal, setJournal] = useState<CoacheeJournal | null>(null)
  const [problem, setProblem] = useState('')
  const journal = loadedJournal?.owner.id === Number(coacheeId) ? loadedJournal : null
  useEffect(() => {
    let current = true
    api<CoacheeJournal>(`coachees/${coacheeId}`)
      .then((result) => {
        if (current) {
          setJournal(result)
          setProblem('')
        }
      })
      .catch((error: Error) => current && setProblem(error.message))
    return () => {
      current = false
    }
  }, [coacheeId, id])
  if (problem)
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className={errorText}>
          {problem}
        </p>
        <Link to="/coachees" className={secondaryButton}>
          Back to coachees
        </Link>
      </div>
    )
  if (!journal) return <p>Loading coaching workspace…</p>
  return (
    <Create
      key={`${coacheeId}-${id ?? 'new'}`}
      coaching={{
        journal,
        onUnavailable: (message) => {
          setJournal(null)
          setProblem(message)
        },
      }}
    />
  )
}

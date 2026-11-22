import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import { api } from '../api'
import type { GoalCongratulations, GoalMilestone } from '../friends'
import { card, errorText, secondaryButton } from '../ui'

export default function GoalMilestones({
  milestones,
  congratulations,
}: {
  milestones: GoalMilestone[]
  congratulations: GoalCongratulations[]
}) {
  const { hash } = useLocation()
  const [sent, setSent] = useState<string[]>([])
  const [pending, setPending] = useState('')
  const [problem, setProblem] = useState<{ id: string; message: string } | null>(null)

  useEffect(() => {
    if (hash.startsWith('#goal-')) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash, milestones, congratulations])

  async function congratulate(id: string) {
    setPending(id)
    setProblem(null)
    try {
      await api(`goal-milestones/${encodeURIComponent(id)}/congratulate`, {})
      setSent((current) => [...current, id])
    } catch (error) {
      setProblem({ id, message: (error as Error).message })
    } finally {
      setPending('')
    }
  }

  return (
    <>
      {milestones.length > 0 && (
        <section className={`${card} mb-4`}>
          <h2 className="mb-2 text-xl font-normal">Goal milestones</h2>
          <ul className="divide-border divide-y">
            {milestones.map((entry) => {
              const congratulated = entry.congratulated || sent.includes(entry.id)
              return (
                <li key={entry.id} id={`goal-${entry.id}`} className="scroll-mt-16 py-2">
                  <p className="font-normal wrap-break-word">
                    {entry.sender} reached a personal goal.
                  </p>
                  <button
                    type="button"
                    className={`${secondaryButton} mt-2`}
                    disabled={pending !== '' || congratulated}
                    onClick={() => void congratulate(entry.id)}
                  >
                    {congratulated
                      ? 'Congratulations sent'
                      : pending === entry.id
                        ? 'Sending…'
                        : 'Send congratulations'}
                  </button>
                  {problem?.id === entry.id && (
                    <p role="alert" className={errorText}>
                      {problem.message}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {congratulations.length > 0 && (
        <section id="goal-congratulations" className={`${card} mb-4 scroll-mt-16`}>
          <h2 className="mb-2 text-xl font-normal">Congratulations on your goals</h2>
          <ul>
            {congratulations.map((entry) => (
              <li key={entry.id} className="py-1 wrap-break-word">
                {entry.sender} sent you congratulations.
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '../api'
import { barPercent, notTrainedSentence } from '../bodyLoad'
import { formatNumber, today } from '../format'
import { useJournal } from '../journal'
import type { BodyLoad, LoadTotals } from '../types'
import { card } from '../ui'
import BodyMap from './BodyMap'
import ExerciseLink from './ExerciseLink'

const periods = [
  { days: '7', label: '7 days', empty: 'No completed sets in the last 7 days.' },
  { days: '28', label: '28 days', empty: 'No completed sets in the last 28 days.' },
  { days: 'all', label: 'All', empty: 'No completed sets yet.' },
]

// "6 sets · 2,400 kg · 105 s": volume and seconds only when there are any.
function describeTotals(totals: LoadTotals): string {
  const parts = [`${totals.sets} ${totals.sets === 1 ? 'set' : 'sets'}`]
  if (totals.volumeKg > 0) parts.push(`${formatNumber(totals.volumeKg)} kg`)
  if (totals.durationSeconds > 0) parts.push(`${totals.durationSeconds} s`)
  return parts.join(' · ')
}

// REV-09: how much each muscle group was trained, as a body map and a list.
export default function BodyLoadCard() {
  const { journal } = useJournal()
  const [days, setDays] = useState('7')
  const [report, setReport] = useState<BodyLoad | null>(null)
  const [problem, setProblem] = useState('')
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const period = periods.find((item) => item.days === days) ?? periods[0]

  useEffect(() => {
    let current = true
    api<BodyLoad>(`body-load?days=${days}&today=${today()}`)
      .then((result) => {
        if (!current) return
        setReport(result)
        setProblem('')
      })
      .catch((error: Error) => current && setProblem(error.message))
    return () => {
      current = false
    }
  }, [days, journal.sessions])

  const groups = report?.groups ?? []
  const trained = groups.filter((group) => group.sets > 0)
  const mostSets = trained.length > 0 ? trained[0].sets : 0
  const levels: Record<string, number> = {}
  for (const group of groups) levels[group.group] = group.level

  return (
    <section className={`${card} mb-4 flex flex-col gap-4`} aria-labelledby="body-load-title">
      <h2 id="body-load-title" className="text-label text-sm font-normal tracking-widest uppercase">
        Body load
      </h2>
      <div className="flex gap-2" role="group" aria-label="Period">
        {periods.map((item) => (
          <button
            key={item.days}
            type="button"
            onClick={() => setDays(item.days)}
            aria-pressed={item.days === days}
            className={
              item.days === days
                ? 'bg-accent text-ink h-11 flex-1 rounded-full font-normal'
                : 'border-border text-text h-11 flex-1 rounded-full border font-normal'
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      {problem && <p className="text-danger text-sm font-normal">{problem}</p>}
      {!report && !problem && <p className="text-muted">Loading…</p>}
      {report && (
        <>
          <BodyMap
            levels={levels}
            label={`Body load, ${period.label}: ${
              trained.map((group) => `${group.group} ${describeTotals(group)}`).join(', ') ||
              'nothing trained'
            }`}
          />
          {trained.length === 0 ? (
            <p className="text-muted">{period.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {trained.map((group) => {
                const open = openGroup === group.group
                return (
                  <li key={group.group}>
                    <button
                      type="button"
                      onClick={() => setOpenGroup(open ? null : group.group)}
                      aria-expanded={open}
                      className="flex min-h-11 w-full flex-col gap-1 py-1 text-left"
                    >
                      <span className="flex w-full items-baseline gap-2">
                        <span className="flex-1 truncate font-normal">{group.group}</span>
                        <span className="font-mono text-xl font-light">{group.sets}</span>
                        <ChevronDown
                          className={open ? 'text-accent size-4 rotate-180' : 'text-muted size-4'}
                          aria-hidden
                        />
                      </span>
                      <svg
                        viewBox="0 0 100 4"
                        preserveAspectRatio="none"
                        className="h-1.5 w-full"
                        aria-hidden
                      >
                        <rect width="100" height="4" rx="2" className="fill-border" />
                        <rect
                          width={barPercent(group.sets, mostSets)}
                          height="4"
                          rx="2"
                          className="fill-accent"
                        />
                      </svg>
                      <span className="text-muted text-sm">{describeTotals(group)}</span>
                    </button>
                    {open && (
                      <ul className="border-border mt-1 flex flex-col border-l pl-3">
                        {group.exercises.map((exercise) => (
                          <li key={exercise.id} className="flex flex-col">
                            <ExerciseLink id={exercise.id} name={exercise.name} />
                            <span className="text-muted -mt-1 pb-1 text-sm">
                              {describeTotals(exercise)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {trained.length > 0 && notTrainedSentence(groups) && (
            <p className="text-muted text-sm">{notTrainedSentence(groups)}</p>
          )}
        </>
      )}
    </section>
  )
}

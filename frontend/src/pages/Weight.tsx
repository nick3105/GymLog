import { useState, type FormEvent } from 'react'

import { api } from '../api'
import LineChart from '../components/LineChart'
import { formatDay, formatNumber, today } from '../format'
import { useJournal } from '../journal'
import type { Weight as WeightEntry } from '../types'
import { card, errorText, input, label, primaryButton } from '../ui'

// WGT-01 to WGT-06: log body weight and see the trend.
export default function Weight() {
  const { journal, setJournal } = useJournal()
  const [day, setDay] = useState(today())
  const [kg, setKg] = useState('')
  const [problem, setProblem] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const entries = journal.weights
  const latest = entries[entries.length - 1]

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setProblem('')
    setMessage('')
    // WGT-03: the API keeps one weight per date, so an existing date is replaced.
    const replacing = entries.some((entry) => entry.day === day)
    try {
      const saved = await api<WeightEntry>('weights', { day, kg: kg === '' ? null : Number(kg) })
      setJournal((current) => ({
        ...current,
        weights: [...current.weights.filter((entry) => entry.day !== saved.day), saved].sort(
          (a, b) => a.day.localeCompare(b.day),
        ),
      }))
      setMessage(replacing ? 'Updated.' : 'Saved.')
      setKg('')
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Weight Tracker</h1>
      <form onSubmit={save} noValidate className={`${card} mb-4 flex flex-col gap-3`}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="weight-day" className={label}>
              Date
            </label>
            <input
              id="weight-day"
              type="date"
              className={input}
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="weight-kg" className={label}>
              Weight (kg)
            </label>
            <input
              id="weight-kg"
              type="text"
              inputMode="decimal"
              placeholder={latest ? formatNumber(latest.kg) : 'kg'}
              className={input}
              value={kg}
              onChange={(event) => setKg(event.target.value.replace(',', '.'))}
            />
          </div>
        </div>
        {problem && (
          <p role="alert" className={errorText}>
            {problem}
          </p>
        )}
        {message && (
          <p role="status" className="text-lime text-sm font-medium">
            {message}
          </p>
        )}
        <button type="submit" disabled={saving} className={primaryButton}>
          Save weight
        </button>
      </form>

      <section className={`${card} flex flex-col gap-3`}>
        <div>
          <p className="text-muted text-sm">Latest</p>
          <p className="text-3xl font-bold">
            {latest ? `${formatNumber(latest.kg)} kg` : '–'}
            {latest && (
              <span className="text-muted ml-2 text-base font-normal">{formatDay(latest.day)}</span>
            )}
          </p>
        </div>
        <LineChart
          title="Body weight"
          points={entries.map((entry) => ({ day: entry.day, value: entry.kg }))}
          unit="kg"
          emptyMessage="Add your first measurement to see your trend."
        />
        {entries.length > 0 && (
          <details>
            <summary className="text-lime flex min-h-11 cursor-pointer items-center font-semibold">
              All measurements ({entries.length})
            </summary>
            <ul>
              {[...entries].reverse().map((entry) => (
                <li key={entry.day} className="border-border flex justify-between border-t py-2">
                  <span>{formatDay(entry.day)}</span>
                  <span className="font-medium">{formatNumber(entry.kg)} kg</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </>
  )
}

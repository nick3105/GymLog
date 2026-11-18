import { useRef, useState, type FormEvent } from 'react'
import { Pencil, Target, Trophy } from 'lucide-react'

import { api } from '../api'
import LineChart from '../components/LineChart'
import { formatDay, formatNumber, today } from '../format'
import { useJournal } from '../journal'
import type { Weight as WeightEntry, WeightGoal } from '../types'
import { goalMatchesDirection, remainingWeight } from '../weightGoal'
import { card, errorText, input, label, primaryButton, secondaryButton, textButton } from '../ui'

// WGT-01 to WGT-07: record body weight, set a goal and follow the trend.
export default function Weight() {
  const { journal, setJournal } = useJournal()
  const [day, setDay] = useState(today())
  const [kg, setKg] = useState('')
  const weightFormRef = useRef<HTMLFormElement>(null)
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [problem, setProblem] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [goalKg, setGoalKg] = useState('')
  const [goalMode, setGoalMode] = useState<WeightGoal['mode']>('lose')
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalProblem, setGoalProblem] = useState('')
  const [goalSaving, setGoalSaving] = useState(false)
  const entries = journal.weights
  const latest = entries[entries.length - 1]
  const goal = journal.weightGoal
  const remaining = remainingWeight(latest?.kg ?? null, goal)

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setProblem('')
    setMessage('')
    const replacing = editingDay !== null || entries.some((entry) => entry.day === day)
    try {
      const saved = await api<WeightEntry>('weights', { day, kg: kg === '' ? null : Number(kg) })
      setJournal((current) => ({
        ...current,
        weights: [...current.weights.filter((entry) => entry.day !== saved.day), saved].sort(
          (a, b) => a.day.localeCompare(b.day),
        ),
      }))
      setMessage(replacing ? 'Updated.' : 'Saved.')
      setEditingDay(null)
      setDay(today())
      setKg('')
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function edit(entry: WeightEntry) {
    setDay(entry.day)
    setKg(formatNumber(entry.kg))
    setEditingDay(entry.day)
    setProblem('')
    setMessage('')
    requestAnimationFrame(() =>
      weightFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  function cancelEdit() {
    setDay(today())
    setKg('')
    setEditingDay(null)
    setProblem('')
    setMessage('')
  }

  async function saveGoal(event: FormEvent) {
    event.preventDefault()
    if (goalKg.trim() === '') {
      setGoalProblem('Enter a goal weight.')
      return
    }
    const requestedGoal = { kg: Number(goalKg), mode: goalMode }
    if (
      !Number.isFinite(requestedGoal.kg) ||
      !goalMatchesDirection(latest?.kg ?? null, requestedGoal)
    ) {
      setGoalProblem(
        goalMode === 'lose'
          ? 'A weight-loss goal must be below your latest weight.'
          : 'A weight-gain goal must be above your latest weight.',
      )
      return
    }
    setGoalSaving(true)
    setGoalProblem('')
    try {
      const saved = await api<{ weightGoal: WeightGoal | null }>('weight-goal', {
        kg: requestedGoal.kg,
        mode: goalMode,
      })
      setJournal((current) => ({ ...current, weightGoal: saved.weightGoal }))
      setGoalKg(saved.weightGoal === null ? '' : formatNumber(saved.weightGoal.kg))
      setEditingGoal(false)
    } catch (error) {
      setGoalProblem((error as Error).message)
    } finally {
      setGoalSaving(false)
    }
  }

  async function clearGoal() {
    setGoalSaving(true)
    setGoalProblem('')
    try {
      const saved = await api<{ weightGoal: WeightGoal | null }>('weight-goal', {
        kg: null,
        mode: goal?.mode ?? goalMode,
      })
      setJournal((current) => ({ ...current, weightGoal: saved.weightGoal }))
      setGoalKg('')
      setEditingGoal(false)
    } catch (error) {
      setGoalProblem((error as Error).message)
    } finally {
      setGoalSaving(false)
    }
  }

  function startGoalEdit() {
    setGoalKg(goal === null ? '' : formatNumber(goal.kg))
    setGoalMode(goal?.mode ?? 'lose')
    setGoalProblem('')
    setEditingGoal(true)
  }

  return (
    <>
      <h1 className="gradient-text mb-4 text-3xl font-bold">Weight Tracker</h1>
      <form
        ref={weightFormRef}
        onSubmit={save}
        noValidate
        className={`${card} mb-4 flex scroll-mt-16 flex-col gap-3`}
      >
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
              disabled={editingDay !== null}
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
          <p role="status" className="text-accent text-sm font-normal">
            {message}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" disabled={saving} className={primaryButton}>
            {editingDay ? 'Update weight' : 'Save weight'}
          </button>
          {editingDay && (
            <button
              type="button"
              disabled={saving}
              onClick={cancelEdit}
              className="border-border text-text min-h-11 rounded-full border px-4 font-normal disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className={`${card} mb-4 flex flex-col gap-3`} aria-labelledby="weight-goal-title">
        <div className="flex items-start gap-3">
          <Target aria-hidden="true" className="text-accent mt-1 shrink-0" size={22} />
          <div className="min-w-0 flex-1">
            <h2 id="weight-goal-title" className="font-normal">
              {goal?.mode === 'gain' ? 'Weight-gain goal' : 'Weight-loss goal'}
            </h2>
            {goal !== null && !editingGoal ? (
              <>
                <p className="mt-1 text-2xl font-light">{formatNumber(goal.kg)} kg</p>
                {!latest ? (
                  <p className="text-muted mt-1 text-sm">
                    Add a measurement to calculate how much remains.
                  </p>
                ) : remaining === 0 ? (
                  <div
                    role="status"
                    className="border-accent/40 bg-accent/10 text-accent mt-3 flex items-center gap-3 rounded-xl border p-4"
                  >
                    <Trophy aria-hidden="true" className="shrink-0" size={24} />
                    <p className="font-normal">Goal reached — great work!</p>
                  </div>
                ) : (
                  <p className="text-muted mt-1 text-sm">
                    {formatNumber(remaining ?? 0)} kg to {goal.mode === 'lose' ? 'lose' : 'gain'}
                  </p>
                )}
              </>
            ) : !editingGoal ? (
              <p className="text-muted mt-1 text-sm">
                Set a goal to see how many kilograms remain.
              </p>
            ) : null}
          </div>
        </div>
        {editingGoal ? (
          <form onSubmit={saveGoal} noValidate className="flex flex-col gap-3">
            <div>
              <label htmlFor="weight-goal-mode" className={label}>
                Goal type
              </label>
              <select
                id="weight-goal-mode"
                className={`${input} mb-3`}
                value={goalMode}
                onChange={(event) => setGoalMode(event.target.value as WeightGoal['mode'])}
              >
                <option value="lose">Lose weight</option>
                <option value="gain">Gain weight</option>
              </select>
              <label htmlFor="weight-goal-kg" className={label}>
                Goal weight (kg)
              </label>
              <input
                id="weight-goal-kg"
                type="text"
                inputMode="decimal"
                className={input}
                placeholder="e.g. 75"
                value={goalKg}
                onChange={(event) => setGoalKg(event.target.value.replace(',', '.'))}
              />
            </div>
            {goalProblem && (
              <p role="alert" className={errorText}>
                {goalProblem}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="submit" disabled={goalSaving} className={secondaryButton}>
                Save goal
              </button>
              <button
                type="button"
                disabled={goalSaving}
                onClick={() => {
                  setGoalKg(goal === null ? '' : formatNumber(goal.kg))
                  setGoalMode(goal?.mode ?? 'lose')
                  setGoalProblem('')
                  setEditingGoal(false)
                }}
                className={secondaryButton}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={goalSaving}
              onClick={startGoalEdit}
              className={secondaryButton}
            >
              {goal === null ? 'Set goal' : 'Change goal'}
            </button>
            {goal !== null && (
              <button
                type="button"
                disabled={goalSaving}
                onClick={clearGoal}
                className={textButton}
              >
                Clear goal
              </button>
            )}
            {goalProblem && (
              <p role="alert" className={errorText}>
                {goalProblem}
              </p>
            )}
          </div>
        )}
      </section>

      <section className={`${card} flex flex-col gap-3`}>
        <div>
          <p className="text-muted text-sm">Latest</p>
          <p className="font-mono text-3xl">
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
          referenceLine={goal === null ? undefined : { value: goal.kg, label: 'Goal' }}
        />
        {entries.length > 0 && (
          <details>
            <summary className="text-accent flex min-h-11 cursor-pointer items-center font-normal">
              All measurements ({entries.length})
            </summary>
            <ul>
              {[...entries].reverse().map((entry) => (
                <li
                  key={entry.day}
                  className="border-border flex items-center justify-between gap-2 border-t py-1"
                >
                  <span>{formatDay(entry.day)}</span>
                  <span className="ml-auto font-normal">{formatNumber(entry.kg)} kg</span>
                  <button
                    type="button"
                    aria-label={`Edit weight for ${formatDay(entry.day)}`}
                    disabled={saving}
                    onClick={() => edit(entry)}
                    className="border-border text-accent inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border disabled:opacity-50"
                  >
                    <Pencil aria-hidden="true" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </>
  )
}

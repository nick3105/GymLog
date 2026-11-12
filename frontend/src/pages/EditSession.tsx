import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'

import { api } from '../api'
import EmptyState from '../components/EmptyState'
import { durationFields, repFields, setPayload } from '../setInput'
import { today } from '../format'
import { useJournal } from '../journal'
import type { Session } from '../types'
import { card, errorText, input, label, primaryButton, secondaryButton } from '../ui'

type Row = { skipped: boolean; weight: string; reps: string; rpe: string; durationSeconds?: string }
export default function EditSession() {
  const { id } = useParams()
  const { journal, setJournal, setBuilderDirty } = useJournal()
  const navigate = useNavigate()
  // Hold the snapshot while typing, including when the journal refreshes.
  const [original] = useState(() => journal.sessions.find((session) => session.id === id))
  const [day, setDay] = useState(original?.day ?? '')
  const [rows, setRows] = useState<Row[][]>(
    () =>
      original?.exercises.map((exercise) =>
        exercise.sets.map((set) =>
          set.skipped
            ? { skipped: true, weight: '', reps: '', rpe: '' }
            : {
                skipped: false,
                ...(set.durationSeconds === undefined
                  ? {}
                  : { durationSeconds: String(set.durationSeconds) }),
                weight: set.weight === undefined ? '' : String(set.weight),
                reps: set.reps === undefined ? '' : String(set.reps),
                rpe: set.rpe === null ? '' : String(set.rpe),
              },
        ),
      ) ?? [],
  )
  const [initialRows] = useState(() => JSON.stringify(rows))
  const saved = useRef(false)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState('')
  const dirty = day !== original?.day || JSON.stringify(rows) !== initialRows

  useEffect(() => {
    setBuilderDirty(dirty)
    return () => setBuilderDirty(false)
  }, [dirty, setBuilderDirty])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !saved.current && (saving || dirty) && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (!saving && window.confirm('Leave without saving these corrections?')) blocker.proceed()
    else blocker.reset()
  }, [blocker, saving])

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty && !saved.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!original)
    return (
      <EmptyState
        title="Session not found."
        text="Choose a completed workout from Review."
        to="/review"
        action="All sessions"
      />
    )
  const session = original

  function update(
    exerciseIndex: number,
    setIndex: number,
    key: 'weight' | 'reps' | 'rpe' | 'durationSeconds',
    value: string,
  ) {
    setRows(
      rows.map((exercise, index) =>
        index === exerciseIndex
          ? exercise.map((row, rowIndex) =>
              rowIndex === setIndex ? { ...row, [key]: value.replace(',', '.') } : row,
            )
          : exercise,
      ),
    )
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setProblem('')
    try {
      const corrected = await api<Session>(`sessions/${session.id}`, {
        day,
        timezoneOffset: new Date().getTimezoneOffset(),
        exercises: session.exercises.map((exercise, index) => ({
          id: exercise.id,
          sets: rows[index].map(setPayload),
        })),
      })
      setJournal((current) => ({
        ...current,
        sessions: current.sessions.map((item) => (item.id === corrected.id ? corrected : item)),
      }))
      saved.current = true
      navigate(`/review/${session.id}`, { state: { notice: 'Workout updated.' } })
    } catch (error) {
      setProblem((error as Error).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <h1 className="gradient-text text-3xl font-bold">Edit workout</h1>
      <p className="text-muted mb-4">{session.name} · your saved routine stays unchanged.</p>
      <label className={`${label} text-base`} htmlFor="session-day">
        Workout date
      </label>
      <input
        id="session-day"
        type="date"
        value={day}
        max={today()}
        disabled={saving}
        onChange={(event) => setDay(event.target.value)}
        className={`${input} mb-4`}
      />
      <div className="flex flex-col gap-4">
        {session.exercises.map((exercise, exerciseIndex) => (
          <section key={exercise.id} className={card}>
            <h2 className="mb-3 text-lg font-normal">{exercise.name}</h2>
            {rows[exerciseIndex].map((row, setIndex) => (
              <div key={setIndex} className="border-border border-t py-3">
                <p className="mb-2">
                  Set {setIndex + 1}
                  {setIndex >= (exercise.plannedSets ?? exercise.sets.length) ? ' · Extra' : ''}
                  {row.skipped ? ' · Skipped' : ''}
                </p>
                {!row.skipped && (
                  <div
                    className={`grid ${exercise.measurement === 'duration' ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}
                  >
                    {(exercise.measurement === 'duration' ? durationFields : repFields).map(
                      ({ key, label: fieldLabel, mode }) => (
                        <label key={key} className="min-w-0">
                          <span className="text-muted mb-1 block">{fieldLabel}</span>
                          <input
                            type="text"
                            inputMode={mode}
                            value={row[key] ?? ''}
                            disabled={saving}
                            aria-label={`${exercise.name}, set ${setIndex + 1}, ${fieldLabel}`}
                            onChange={(event) =>
                              update(exerciseIndex, setIndex, key, event.target.value)
                            }
                            className={`${input} px-2 text-center`}
                          />
                        </label>
                      ),
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className="bg-ink/95 sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-4 flex flex-col gap-2 rounded-lg p-3 backdrop-blur md:bottom-4">
        {problem && (
          <p role="alert" className={errorText}>
            {problem}
          </p>
        )}
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => navigate(`/review/${session.id}`)}
          className={secondaryButton}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

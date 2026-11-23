import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { api } from '../api'
import {
  competitionSports,
  preparationStages,
  weekdays,
  type CompetitionCalendar,
  type CompetitionDraft,
  type CompetitionIntake,
  type CompetitionSeed,
  type CompetitionSport,
  type CompetitionWorkout,
  type PreparationStage,
} from '../competition'
import { today } from '../format'
import { newId } from '../newId'
import { shiftScheduleDay } from '../schedule'
import { errorText, input, primaryButton, secondaryButton, textButton } from '../ui'
import CompetitionPreview from './CompetitionPreview'

type Answers = Omit<CompetitionIntake, 'today' | 'stage'> & { stage: PreparationStage | '' }

const prepHelp = {
  powerlifting: 'Tell us about your current programme and recent lifting.',
  hyrox: 'Tell us about your recent runs, station practice and division.',
  marathon: 'Tell us your recent weekly distance and longest run.',
}

export default function CompetitionPlanner({
  seed,
  onOpenSchedule,
}: {
  seed?: CompetitionSeed
  onOpenSchedule?: () => void
}) {
  const [answers, setAnswers] = useState<Answers>({
    sport: seed?.sport ?? 'powerlifting',
    eventDate: seed?.eventDate ?? '',
    eventName: '',
    stage: '',
    recentTraining: '',
    goal: '',
    equipment: '',
    sessionsPerWeek: 3,
    minutesPerSession: 45,
    weekdays: [],
  })
  const [exactDays, setExactDays] = useState(false)
  const [consent, setConsent] = useState(false)
  const [step, setStep] = useState<'prep' | 'availability' | 'preview'>('prep')
  const [draft, setDraft] = useState<CompetitionDraft | null>(null)
  const [requestId, setRequestId] = useState(newId)
  const [savedWeek, setSavedWeek] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [savedWeek, step])

  function update<Key extends keyof Answers>(key: Key, value: Answers[Key]) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  async function generate(event: FormEvent) {
    event.preventDefault()
    if (busy || !answers.stage || !consent) return
    setProblem('')
    setNotice('')
    if (exactDays && answers.weekdays.length < answers.sessionsPerWeek) {
      setProblem('Choose at least as many weekdays as sessions per week.')
      return
    }
    const intake: CompetitionIntake = {
      ...answers,
      stage: answers.stage,
      today: today(),
      weekdays: exactDays ? answers.weekdays : [],
    }
    setBusy(true)
    try {
      setDraft(await api<CompetitionDraft>('assistant/competition-plan', { consent, intake }))
      setRequestId(newId())
      setStep('preview')
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function editWorkout(weekIndex: number, workoutIndex: number, replacement?: CompetitionWorkout) {
    setDraft((current) => {
      if (!current) return current
      const weeks = current.plan.weeks.map((week, index) => {
        if (index !== weekIndex) return week
        const sessions = [...week.sessions]
        if (replacement) sessions[workoutIndex] = replacement
        else sessions.splice(workoutIndex, 1)
        return { ...week, sessions }
      })
      return { ...current, plan: { ...current.plan, weeks } }
    })
  }

  async function save() {
    if (!draft || busy) return
    setBusy(true)
    setProblem('')
    setNotice('')
    try {
      const result = await api<{ week: string }>('competition-plans', {
        id: requestId,
        revision: draft.revision,
        today: today(),
        intake: draft.intake,
        plan: draft.plan,
      })
      setSavedWeek(result.week)
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    if (!draft || busy) return
    setBusy(true)
    setProblem('')
    try {
      const calendar = await api<CompetitionCalendar>('competition-plans/preview', {
        intake: draft.intake,
      })
      setDraft({ ...draft, ...calendar })
      setNotice('Schedule refreshed. Review the existing workouts before saving.')
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (savedWeek)
    return (
      <div className="space-y-4">
        <h3 ref={heading} tabIndex={-1} className="text-xl font-normal">
          Competition plan saved
        </h3>
        <p role="status">Your event and training sessions are in Schedule.</p>
        <Link
          to={'/schedule?week=' + savedWeek}
          className={primaryButton + ' w-full'}
          onClick={onOpenSchedule}
        >
          Open Schedule
        </Link>
        <button
          type="button"
          className={textButton}
          onClick={() => {
            setSavedWeek('')
            setDraft(null)
            setAnswers((current) => ({ ...current, eventDate: '', eventName: '' }))
            setStep('prep')
          }}
        >
          Plan another competition
        </button>
      </div>
    )

  if (step === 'preview' && draft)
    return (
      <div className="min-w-0 space-y-4">
        <h3 ref={heading} tabIndex={-1} className="text-xl font-normal">
          Review your competition schedule
        </h3>
        {problem && (
          <div>
            <p role="alert" className={errorText}>{problem}</p>
            <button type="button" className={textButton} disabled={busy} onClick={refresh}>
              Refresh schedule, keep preview
            </button>
          </div>
        )}
        {notice && <p role="status">{notice}</p>}
        {busy && <p role="status">Working on your schedule…</p>}
        <CompetitionPreview
          draft={draft}
          busy={busy}
          onEdit={editWorkout}
          onRemove={editWorkout}
          onSave={save}
          onBack={() => {
            setProblem('')
            setNotice('')
            setStep('prep')
          }}
        />
      </div>
    )

  if (step === 'prep')
    return (
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          setStep('availability')
        }}
      >
        <h3 ref={heading} tabIndex={-1} className="text-xl font-normal">
          When are you competing?
        </h3>
        <label className="block">
          Sport
          <select
            className={input + ' mt-1'}
            value={answers.sport}
            onChange={(event) => update('sport', event.target.value as CompetitionSport)}
          >
            {Object.entries(competitionSports).map(([value, name]) => (
              <option key={value} value={value}>{name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Competition date
          <input
            type="date"
            required
            min={shiftScheduleDay(today(), 1)}
            className={input + ' mt-1'}
            value={answers.eventDate}
            onChange={(event) => update('eventDate', event.target.value)}
          />
        </label>
        <h3 className="text-xl font-normal">Where are you in your prep?</h3>
        <label className="block">
          Preparation stage
          <select
            className={input + ' mt-1'}
            required
            value={answers.stage}
            onChange={(event) => update('stage', event.target.value as PreparationStage | '')}
          >
            <option value="">Choose your stage</option>
            {Object.entries(preparationStages).map(([value, name]) => (
              <option key={value} value={value}>{name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Recent training
          <textarea
            className={input + ' mt-1 min-h-24 rounded-lg py-3'}
            required
            maxLength={600}
            value={answers.recentTraining}
            placeholder={prepHelp[answers.sport] + ' You can say you have not started.'}
            onChange={(event) => update('recentTraining', event.target.value)}
          />
        </label>
        <button className={primaryButton + ' w-full'}>Continue</button>
      </form>
    )

  return (
    <form className="space-y-4" onSubmit={generate}>
      <h3 ref={heading} tabIndex={-1} className="text-xl font-normal">
        What can you fit into a week?
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <label>
          Sessions per week
          <input
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={7}
            className={input + ' mt-1'}
            value={answers.sessionsPerWeek || ''}
            disabled={busy}
            onChange={(event) => update('sessionsPerWeek', Number(event.target.value))}
          />
        </label>
        <label>
          Minutes per session
          <input
            type="number"
            inputMode="numeric"
            required
            min={15}
            max={180}
            className={input + ' mt-1'}
            value={answers.minutesPerSession || ''}
            disabled={busy}
            onChange={(event) => update('minutesPerSession', Number(event.target.value))}
          />
        </label>
      </div>
      <label className="block">
        Scheduling
        <select
          className={input + ' mt-1'}
          value={exactDays ? 'dated' : 'flexible'}
          disabled={busy}
          onChange={(event) => setExactDays(event.target.value === 'dated')}
        >
          <option value="flexible">Flexible workouts each week</option>
          <option value="dated">Specific weekdays</option>
        </select>
      </label>
      {exactDays && (
        <fieldset className="grid grid-cols-2 gap-x-2">
          <legend>Available weekdays</legend>
          {weekdays.map((day, index) => (
            <label key={day} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                className="accent-accent size-5"
                checked={answers.weekdays.includes(index)}
                disabled={busy}
                onChange={(event) =>
                  update(
                    'weekdays',
                    event.target.checked
                      ? [...answers.weekdays, index]
                      : answers.weekdays.filter((item) => item !== index),
                  )
                }
              />
              {day}
            </label>
          ))}
        </fieldset>
      )}
      {(['goal', 'equipment', 'eventName'] as const).map((field) => (
        <label key={field} className="block">
          {{ goal: 'Goal', equipment: 'Equipment or commitments', eventName: 'Event name' }[field]} (optional)
          <input
            className={input + ' mt-1'}
            maxLength={field === 'eventName' ? 80 : 300}
            value={answers[field]}
            disabled={busy}
            onChange={(event) => update(field, event.target.value)}
          />
        </label>
      ))}
      <label className="flex min-h-11 items-start gap-3">
        <input
          type="checkbox"
          className="accent-accent mt-1 size-5 shrink-0"
          checked={consent}
          disabled={busy}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          Share the date and prep answers with Requesty and its model host. The event name stays in GymLog.
        </span>
      </label>
      {problem && <p role="alert" className={errorText}>{problem}</p>}
      <button className={primaryButton + ' w-full'} disabled={busy || !consent}>
        {busy ? 'Building your schedule…' : 'Generate competition plan'}
      </button>
      <button
        type="button"
        className={secondaryButton}
        disabled={busy}
        onClick={() => {
          setProblem('')
          setStep('prep')
        }}
      >
        Back to preparation
      </button>
    </form>
  )
}

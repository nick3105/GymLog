import { ChevronRight, ListChecks, Play, Plus, Scale, X, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import Notice from '../components/Notice'
import { formatDay, today } from '../format'
import { useJournal } from '../journal'
import { shouldShowWeightReminder } from '../weightReminder'

const choices: { to: string; title: string; text: string; icon: LucideIcon }[] = [
  {
    to: '/start',
    title: 'Start workout',
    text: 'Pick a saved workout and log your sets.',
    icon: Play,
  },
  {
    to: '/create',
    title: 'Create workout',
    text: 'Plan exercises and targets once, repeat them.',
    icon: Plus,
  },
  {
    to: '/review',
    title: 'Review workouts',
    text: 'See what you lifted and how you progress.',
    icon: ListChecks,
  },
  {
    to: '/weight',
    title: 'Weight Tracker',
    text: 'Log your body weight and follow the trend.',
    icon: Scale,
  },
]

// NAV-01: the four starting points, and a short summary of the journal.
export default function Home() {
  const { username, journal, weightReminderDismissed, dismissWeightReminder } = useJournal()
  const lastSession = [...journal.sessions].sort((a, b) => b.day.localeCompare(a.day))[0]
  const showWeightReminder = shouldShowWeightReminder(
    journal.weights,
    today(),
    weightReminderDismissed,
  )

  return (
    <>
      <Notice />
      <h1 className="gradient-text mb-1 text-3xl font-bold">Hi, {username}.</h1>
      <p className="text-muted mb-6">Make your next session count.</p>
      {showWeightReminder && (
        <section
          aria-labelledby="weight-reminder-title"
          className="border-lime/30 bg-panel mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <Scale className="text-lime mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <h2 id="weight-reminder-title" className="font-semibold">
                Weight check-in
              </h2>
              <p className="text-muted mt-1 text-sm">
                You haven’t logged your weight today. A quick check-in keeps your progress up to
                date.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
            <Link
              to="/weight"
              className="border-lime/40 text-lime flex min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-semibold"
            >
              Log today’s weight
            </Link>
            <button
              type="button"
              onClick={dismissWeightReminder}
              aria-label="Dismiss weight reminder"
              className="text-muted flex size-11 shrink-0 items-center justify-center rounded-lg"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </section>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {choices.map(({ to, title, text, icon: Icon }, index) => (
          <Link
            key={to}
            to={to}
            className={`flex min-h-20 items-center gap-4 rounded-lg p-4 ${index === 0 ? 'from-gradient-start to-gradient-end bg-linear-to-tr text-white' : 'bg-panel'}`}
          >
            <Icon className="size-7 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-normal">{title}</span>
              <span className={`block text-sm ${index === 0 ? 'text-white/80' : 'text-muted'}`}>
                {text}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0" aria-hidden />
          </Link>
        ))}
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className="bg-panel rounded-lg p-3">
          <dt className="text-label text-xs tracking-widest uppercase">Workouts</dt>
          <dd className="font-mono text-xl">{journal.templates.length}</dd>
        </div>
        <div className="bg-panel rounded-lg p-3">
          <dt className="text-label text-xs tracking-widest uppercase">Sessions</dt>
          <dd className="font-mono text-xl">{journal.sessions.length}</dd>
        </div>
        <div className="bg-panel rounded-lg p-3">
          <dt className="text-label text-xs tracking-widest uppercase">Last session</dt>
          <dd className="font-mono text-sm">{lastSession ? formatDay(lastSession.day) : '–'}</dd>
        </div>
      </dl>
    </>
  )
}

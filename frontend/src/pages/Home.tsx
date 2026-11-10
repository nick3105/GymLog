import { ChevronRight, ListChecks, Play, Plus, Scale, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import Notice from '../components/Notice'
import { formatDay } from '../format'
import { useJournal } from '../journal'

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
  const { username, journal } = useJournal()
  const lastSession = [...journal.sessions].sort((a, b) => b.day.localeCompare(a.day))[0]

  return (
    <>
      <Notice />
      <h1 className="mb-1 text-3xl font-bold">Hi, {username}.</h1>
      <p className="text-muted mb-6">Make your next session count.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {choices.map(({ to, title, text, icon: Icon }, index) => (
          <Link
            key={to}
            to={to}
            className={`flex min-h-20 items-center gap-4 rounded-2xl border p-4 ${index === 0 ? 'border-lime bg-lime text-ink' : 'border-border bg-panel'}`}
          >
            <Icon className="size-7 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold">{title}</span>
              <span className={`block text-sm ${index === 0 ? 'text-ink/75' : 'text-muted'}`}>
                {text}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0" aria-hidden />
          </Link>
        ))}
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className="border-border rounded-2xl border p-3">
          <dt className="text-muted text-xs">Workouts</dt>
          <dd className="text-xl font-bold">{journal.templates.length}</dd>
        </div>
        <div className="border-border rounded-2xl border p-3">
          <dt className="text-muted text-xs">Sessions</dt>
          <dd className="text-xl font-bold">{journal.sessions.length}</dd>
        </div>
        <div className="border-border rounded-2xl border p-3">
          <dt className="text-muted text-xs">Last session</dt>
          <dd className="text-sm font-bold">{lastSession ? formatDay(lastSession.day) : '–'}</dd>
        </div>
      </dl>
    </>
  )
}

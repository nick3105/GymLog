import {
  Dumbbell,
  House,
  ListChecks,
  LogOut,
  Play,
  Plus,
  RefreshCw,
  Scale,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router'

import { useJournal } from '../journal'
import ProgressSheet from './ProgressSheet'

const pages: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/start', label: 'Start', icon: Play },
  { to: '/create', label: 'Create', icon: Plus },
  { to: '/review', label: 'Review', icon: ListChecks },
  { to: '/weight', label: 'Weight', icon: Scale },
]

// The frame around every signed-in page: top bar, bottom bar on phones, sidebar from md: up.
export default function Layout() {
  const { username, refresh, signOut, active } = useJournal()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [problem, setProblem] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const exerciseId = searchParams.get('exercise')

  async function reload() {
    setRefreshing(true)
    setProblem('')
    try {
      await refresh()
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setRefreshing(false)
    }
  }

  async function leave() {
    try {
      await signOut()
    } catch (error) {
      setProblem((error as Error).message)
    }
  }

  return (
    <div className="min-h-dvh md:pl-56">
      <header className="border-border bg-ink/95 sticky top-0 z-20 border-b pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <Link to="/" className="flex min-h-11 items-center gap-2 text-lg font-bold md:hidden">
            <Dumbbell className="text-accent size-5" aria-hidden />
            gymlog<span className="text-accent">.</span>
          </Link>
          <span className="text-muted ml-auto truncate text-sm">{username}</span>
          <button
            type="button"
            onClick={reload}
            disabled={refreshing}
            aria-label="Reload your journal"
            className="text-muted flex size-11 items-center justify-center rounded-xl disabled:opacity-40"
          >
            <RefreshCw className={refreshing ? 'size-5 animate-spin' : 'size-5'} aria-hidden />
          </button>
          <button
            type="button"
            onClick={leave}
            aria-label="Sign out"
            className="text-muted flex size-11 items-center justify-center rounded-xl"
          >
            <LogOut className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      <nav className="border-border bg-panel fixed inset-y-0 left-0 z-30 hidden w-56 flex-col gap-1 border-r p-4 md:flex">
        <Link to="/" className="mb-6 flex min-h-11 items-center gap-2 px-2 text-xl font-bold">
          <Dumbbell className="text-accent size-6" aria-hidden />
          gymlog<span className="text-accent">.</span>
        </Link>
        {pages.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium ${isActive ? 'bg-accent/10 text-accent' : 'text-muted'}`
            }
          >
            <Icon className="size-5" aria-hidden />
            {label === 'Weight' ? 'Weight Tracker' : label}
          </NavLink>
        ))}
      </nav>

      <main className="mx-auto max-w-2xl px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10">
        {problem && <p className="text-danger mb-4 text-sm font-medium">{problem}</p>}
        {active && location.pathname !== '/session' && (
          <Link
            to="/session"
            className="border-accent/40 bg-accent/10 text-accent mb-4 flex min-h-12 items-center justify-between rounded-xl border px-4 font-semibold"
          >
            Workout in progress: {active.name}
            <span aria-hidden>Resume →</span>
          </Link>
        )}
        <Outlet />
      </main>

      <nav className="border-border bg-panel fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {pages.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${isActive ? 'text-accent' : 'text-muted'}`
                }
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {exerciseId && <ProgressSheet exerciseId={exerciseId} />}
    </div>
  )
}

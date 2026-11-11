import { Dumbbell } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { useJournal } from '../journal'
import { errorText, input, label, primaryButton } from '../ui'

type Props = { mode: 'login' | 'register' }

// Sign in (ACC-04) and Create account (ACC-01). Signing up signs you in.
export default function AuthForm({ mode }: Props) {
  const { signIn } = useJournal()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const creating = mode === 'register'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setProblem('')
    try {
      await signIn(mode, username, password)
    } catch (error) {
      setProblem((error as Error).message)
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <p className="flex items-center gap-2 text-2xl font-bold">
        <Dumbbell className="text-accent" aria-hidden />
        gymlog<span className="text-accent">.</span>
      </p>
      <h1 className="text-3xl font-semibold">
        {creating ? 'Create your account.' : 'Show up. Keep getting stronger.'}
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="username" className={label}>
            Username
          </label>
          <input
            id="username"
            className={input}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          {creating && (
            <p className="text-muted mt-1 text-sm">3–30 lowercase letters, numbers, - or _.</p>
          )}
        </div>
        <div>
          <label htmlFor="password" className={label}>
            Password
          </label>
          <input
            id="password"
            type="password"
            className={input}
            autoComplete={creating ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {creating && <p className="text-muted mt-1 text-sm">At least 12 characters.</p>}
        </div>
        {problem && (
          <p role="alert" className={errorText}>
            {problem}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButton}>
          {creating ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <p className="text-muted text-center">
        {creating ? 'Already have an account? ' : 'New here? '}
        <Link
          to={creating ? '/signin' : '/register'}
          className="text-accent inline-flex min-h-11 items-center font-semibold"
        >
          {creating ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </main>
  )
}

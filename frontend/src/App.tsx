import { Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'

type Health = 'checking' | 'ok' | 'down'

export default function App() {
  const [health, setHealth] = useState<Health>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => setHealth(response.ok ? 'ok' : 'down'))
      .catch(() => setHealth('down'))
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-6">
      <p className="flex items-center gap-2 text-2xl font-bold">
        <Dumbbell className="text-lime" aria-hidden />
        gymlog<span className="text-lime">.</span>
      </p>
      <h1 className="text-4xl font-semibold">Show up. Keep getting stronger.</h1>
      <p className="text-muted">
        API:{' '}
        <span className={health === 'ok' ? 'text-lime' : undefined}>
          {health === 'checking' ? 'checking…' : health === 'ok' ? 'connected' : 'unreachable'}
        </span>
      </p>
    </main>
  )
}

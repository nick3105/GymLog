import { useEffect, useState } from 'react'

import { api } from './api'
import type { ScheduleState } from './schedule'

export function readSchedule(day: string) {
  return api<ScheduleState>('schedule?week=' + encodeURIComponent(day))
}

export function useSchedule(day: string) {
  const [retry, setRetry] = useState(0)
  const key = day + ':' + retry
  const [loaded, setLoaded] = useState<{
    key: string
    state: ScheduleState | null
    problem: string
  } | null>(null)

  useEffect(() => {
    let current = true
    readSchedule(day).then(
      (data) => {
        if (current) setLoaded({ key, state: data, problem: '' })
      },
      (error: Error) => {
        if (current) setLoaded({ key, state: null, problem: error.message })
      },
    )
    return () => {
      current = false
    }
  }, [day, key])

  const result = loaded?.key === key ? loaded : null
  return {
    state: result?.state ?? null,
    problem: result?.problem ?? '',
    setState: (state: ScheduleState) => setLoaded({ key, state, problem: '' }),
    reload: () => setRetry((count) => count + 1),
  }
}

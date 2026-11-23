import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'

import { useJournal } from './journal'

export function useScheduleForm(dirty: boolean) {
  const { setBuilderDirty } = useJournal()
  const saved = useRef(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    setBuilderDirty(dirty)
    return () => setBuilderDirty(false)
  }, [dirty, setBuilderDirty])

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Leave without saving your schedule changes?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  return () => {
    saved.current = true
  }
}

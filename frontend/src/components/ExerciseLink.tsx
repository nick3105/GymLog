import { ChevronRight } from 'lucide-react'
import { useSearchParams } from 'react-router'

// An exercise name that opens its progress sheet on top of the current page (REV-03).
// The sheet is a URL parameter, so the phone's back gesture closes it and nothing underneath
// is unmounted — every unsaved input stays (REV-07).
export default function ExerciseLink({
  id,
  name,
  measurement,
}: {
  id: string
  name: string
  measurement?: 'duration' | 'repetitions'
}) {
  const [searchParams, setSearchParams] = useSearchParams()

  function open() {
    const next = new URLSearchParams(searchParams)
    next.set('exercise', id)
    next.set('exerciseName', name)
    if (measurement === 'duration') next.set('measurement', 'duration')
    else next.delete('measurement')
    setSearchParams(next, { preventScrollReset: true })
  }

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex min-h-11 max-w-full min-w-0 items-center gap-1 text-left text-lg font-normal"
    >
      <span className="truncate">{name}</span>
      <ChevronRight className="text-accent size-4 shrink-0" aria-hidden />
    </button>
  )
}

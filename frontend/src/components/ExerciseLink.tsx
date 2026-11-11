import { ChevronRight } from 'lucide-react'
import { useSearchParams } from 'react-router'

// An exercise name that opens its progress sheet on top of the current page (REV-03).
// The sheet is a URL parameter, so the phone's back gesture closes it and nothing underneath
// is unmounted — every unsaved input stays (REV-07).
export default function ExerciseLink({ id, name }: { id: string; name: string }) {
  const [searchParams, setSearchParams] = useSearchParams()

  function open() {
    const next = new URLSearchParams(searchParams)
    next.set('exercise', id)
    setSearchParams(next, { preventScrollReset: true })
  }

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex min-h-11 min-w-0 items-center gap-1 text-left text-lg font-semibold"
    >
      <span className="truncate">{name}</span>
      <ChevronRight className="text-accent size-4 shrink-0" aria-hidden />
    </button>
  )
}

import { Dumbbell } from 'lucide-react'

export default function BrandWordmark() {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Dumbbell className="text-accent size-[1em] shrink-0" aria-hidden />
      <span>
        TimeTo<span className="text-accent">Lift</span>
      </span>
    </span>
  )
}

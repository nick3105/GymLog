import { Check, ChevronDown, Dumbbell } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { equipmentOptions } from '../equipment'
import type { Equipment } from '../types'

type Props = { value: Equipment | ''; onChange: (value: Equipment | '') => void }

// A rounded dropdown stays attached to its trigger, with ordinary buttons for keyboard access.
export default function EquipmentFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const selected = useRef<HTMLButtonElement>(null)
  const id = useId()
  const current = equipmentOptions.find((option) => option.value === value) ?? equipmentOptions[0]

  useEffect(() => {
    if (!open) return
    selected.current?.focus({ preventScroll: true })
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  function close() {
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }

  return (
    <div
      ref={container}
      className="relative mt-3"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          close()
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <p className="text-label mb-1 text-base font-normal">Equipment</p>
      <button
        ref={trigger}
        type="button"
        aria-label={`Equipment: ${current.label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="gradient-border text-text focus-visible:outline-accent flex min-h-12 w-full items-center justify-between gap-3 rounded-full px-4 font-normal focus-visible:outline-2"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Dumbbell className="text-accent size-5 shrink-0" aria-hidden />
          <span className="truncate">{current.label}</span>
        </span>
        <ChevronDown
          className={`text-muted size-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          id={id}
          role="group"
          aria-label="Equipment options"
          className="border-border bg-panel absolute top-full right-0 left-0 z-30 mt-2 max-h-[min(22rem,42dvh)] overflow-y-auto overscroll-contain rounded-2xl border p-2 shadow-2xl"
        >
          {equipmentOptions.map((option) => (
            <button
              key={option.value}
              ref={option.value === value ? selected : undefined}
              type="button"
              aria-pressed={option.value === value}
              onClick={() => {
                onChange(option.value)
                close()
              }}
              className={`focus-visible:outline-accent flex min-h-11 w-full items-center justify-between gap-3 rounded-full px-4 py-2 text-left text-base font-normal focus-visible:outline-2 ${option.value === value ? 'bg-accent/15 text-accent' : 'text-text hover:bg-ink'}`}
            >
              {option.label}
              {option.value === value && <Check className="size-5 shrink-0" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

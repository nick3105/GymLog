import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

import { insertionIndex, moveItem } from '../reorder'
import { card } from '../ui'

type Item = { id: string; name: string }
type Drag = { id: string; to: number | null }
type Gesture = {
  id: string
  pointerId: number
  x: number
  y: number
  startX: number
  startY: number
  pickedUp: boolean
  startScroll: number
}
type Props<T extends Item> = {
  items: T[]
  enabled: boolean
  onChange: (items: T[]) => void
  children: (item: T, index: number) => ReactNode
}

// Pointer capture keeps touch and mouse drags working when the pointer leaves the grip.
export default function ReorderList<T extends Item>({
  items,
  enabled,
  onChange,
  children,
}: Props<T>) {
  const list = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frame = useRef<number | null>(null)
  const motion = useRef<Animation | null>(null)
  const cards = useRef(new Map<string, HTMLDivElement>())
  const [drag, setDrag] = useState<Drag | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const canReorder = enabled && items.length > 1

  function clearGesture() {
    if (timer.current !== null) clearTimeout(timer.current)
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    timer.current = null
    frame.current = null
    motion.current?.cancel()
    motion.current = null
    gesture.current = null
    setDrag(null)
  }

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !gesture.current) return
      event.preventDefault()
      clearGesture()
      setAnnouncement('Move cancelled. Exercise order unchanged.')
    }
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('keydown', escape)
      if (timer.current !== null) clearTimeout(timer.current)
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      motion.current?.cancel()
    }
  }, [])

  function dropIndex(current: Gesture) {
    const bounds = list.current?.getBoundingClientRect()
    const underPointer = document.elementFromPoint(current.x, current.y)
    if (
      !bounds ||
      !underPointer ||
      !list.current?.contains(underPointer) ||
      current.x < bounds.left ||
      current.x > bounds.right ||
      current.y < bounds.top ||
      current.y > bounds.bottom
    )
      return null
    const remaining = items.filter((item) => item.id !== current.id)
    const midpoints = remaining.map((item) => {
      const rect = cards.current.get(item.id)!.getBoundingClientRect()
      return rect.top + rect.height / 2
    })
    return insertionIndex(current.y, midpoints)
  }

  function scrollWhileDragging() {
    const current = gesture.current
    if (!current?.pickedUp) return
    const edge = 100
    const bottom = window.innerHeight - 100 // Leave room for the fixed phone navigation.
    let amount = 0
    if (current.y < edge) amount = -Math.min(14, (edge - current.y) / 5)
    else if (current.y > bottom) amount = Math.min(14, (current.y - bottom) / 5)
    if (amount !== 0) window.scrollBy(0, amount)
    followPointer(current)
    const to = dropIndex(current)
    setDrag((previous) => (previous?.to === to ? previous : { id: current.id, to }))
    frame.current = requestAnimationFrame(scrollWhileDragging)
  }

  function followPointer(current: Gesture) {
    const offset = current.y - current.startY + window.scrollY - current.startScroll
    const transform = `translateY(${offset}px)`
    // The browser animation moves the card without adding inline styles or new CSS.
    const effect = motion.current?.effect
    if (effect instanceof KeyframeEffect) effect.setKeyframes([{ transform }, { transform }])
  }

  function pickUp() {
    const current = gesture.current
    if (!current) return
    current.pickedUp = true
    const node = cards.current.get(current.id)
    motion.current =
      node?.animate([{ transform: 'translateY(0px)' }, { transform: 'translateY(0px)' }], {
        duration: 1,
        fill: 'both',
      }) ?? null
    if (motion.current) {
      motion.current.pause()
      motion.current.currentTime = 1
    }
    followPointer(current)
    setDrag({ id: current.id, to: items.findIndex((item) => item.id === current.id) })
    setAnnouncement('Exercise picked up. Drag to a new position, release to place. Escape cancels.')
    frame.current = requestAnimationFrame(scrollWhileDragging)
  }

  function begin(event: PointerEvent<HTMLButtonElement>, item: T) {
    if (
      !canReorder ||
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0) ||
      gesture.current
    )
      return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      id: item.id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      pickedUp: false,
      startScroll: window.scrollY,
    }
    if (event.pointerType === 'mouse') pickUp()
    else timer.current = setTimeout(pickUp, 300)
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    current.x = event.clientX
    current.y = event.clientY
    if (
      !current.pickedUp &&
      Math.hypot(current.x - current.startX, current.y - current.startY) > 8
    ) {
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = null
      pickUp()
    }
    if (current.pickedUp) {
      followPointer(current)
      setDrag({ id: current.id, to: dropIndex(current) })
    }
  }

  function announce(item: T, position: number) {
    setAnnouncement(`${item.name}, ${position + 1} of ${items.length}.`)
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    current.x = event.clientX
    current.y = event.clientY
    const to = current.pickedUp ? dropIndex(current) : null
    if (to !== null) {
      const from = items.findIndex((item) => item.id === current.id)
      onChange(moveItem(items, from, to))
      announce(items[from], to)
    } else if (current.pickedUp) setAnnouncement('Move cancelled. Exercise order unchanged.')
    clearGesture()
  }

  function moveWithButton(index: number, direction: number) {
    const item = items[index]
    const to = index + direction
    onChange(moveItem(items, index, to))
    announce(item, to)
    // Keep keyboard focus on the same exercise, even when a boundary disables its button.
    cards.current.get(item.id)?.focus({ preventScroll: true })
  }

  const remaining = items.filter((item) => item.id !== drag?.id)
  const beforeId = drag?.to !== null && drag?.to !== undefined ? remaining[drag.to]?.id : undefined
  const marker = <div aria-hidden className="bg-accent h-1 rounded-full" />

  return (
    <div>
      {canReorder && (
        <p className="text-muted mb-3 text-sm">Drag the grip to reorder. Or use the arrows.</p>
      )}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
      <div ref={list} className="flex flex-col gap-4">
        {items.map((item, index) => (
          <div key={item.id}>
            {beforeId === item.id && <div className="mb-2">{marker}</div>}
            <div
              ref={(node) => {
                if (node) cards.current.set(item.id, node)
                else cards.current.delete(item.id)
              }}
              tabIndex={-1}
              aria-label={`${item.name}, ${index + 1} of ${items.length}`}
              className={`${card} focus-visible:outline-accent focus-visible:outline-2 ${drag?.id === item.id ? 'ring-accent pointer-events-none relative z-40 shadow-2xl ring-2' : ''}`}
            >
              {canReorder && (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-label={`Drag to reorder ${item.name}`}
                    aria-describedby="reorder-help"
                    className="text-muted active:text-accent flex min-h-11 min-w-11 flex-1 touch-none items-center gap-2 rounded-full px-2 select-none [-webkit-touch-callout:none]"
                    onPointerDown={(event) => begin(event, item)}
                    onPointerMove={move}
                    onPointerUp={finish}
                    onPointerCancel={() => {
                      clearGesture()
                      setAnnouncement('Move cancelled. Exercise order unchanged.')
                    }}
                    onLostPointerCapture={() => {
                      if (gesture.current) clearGesture()
                    }}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    <GripVertical className="size-5" aria-hidden />
                    <span className="text-sm">
                      {index + 1} of {items.length}
                    </span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={index === 0 || drag !== null}
                      aria-label={`Move ${item.name} up`}
                      onClick={() => moveWithButton(index, -1)}
                      className="text-muted flex size-11 items-center justify-center rounded-full disabled:opacity-30"
                    >
                      <ArrowUp className="size-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1 || drag !== null}
                      aria-label={`Move ${item.name} down`}
                      onClick={() => moveWithButton(index, 1)}
                      className="text-muted flex size-11 items-center justify-center rounded-full disabled:opacity-30"
                    >
                      <ArrowDown className="size-5" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
              {children(item, index)}
            </div>
          </div>
        ))}
        {drag?.to === remaining.length && marker}
      </div>
      <span id="reorder-help" className="sr-only">
        On a phone, hold briefly before dragging. Release outside the list or press Escape to
        cancel. Arrow buttons also change the order.
      </span>
    </div>
  )
}

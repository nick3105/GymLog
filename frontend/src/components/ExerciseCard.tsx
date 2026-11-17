import { ArrowUpRight, ChartNoAxesCombined, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { Exercise } from '../types'

type Props = {
  exercise: Exercise
  onOpen: () => void
  compact?: boolean
  phoneControls: boolean
  playing: boolean
  onTogglePlay: () => void
}

// Phones use one explicit Play selection; desktop keeps automatic and hover previews.
export default function ExerciseCard({
  exercise,
  onOpen,
  compact = false,
  phoneControls,
  playing,
  onTogglePlay,
}: Props) {
  const [manual, setManual] = useState(false)
  const [failed, setFailed] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(!document.hidden)
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [endReady, setEndReady] = useState(false)
  const [position, setPosition] = useState(0)
  const photo = useRef<HTMLDivElement>(null)
  const hasPhoto = Boolean(exercise.thumbnail) && !failed
  const preview =
    hasPhoto &&
    !previewFailed &&
    visible &&
    pageVisible &&
    (phoneControls && compact ? playing : !reducedMotion && (!compact || manual))
  const shown = preview && endReady ? position : 0

  useEffect(() => {
    const frame = photo.current
    if (!frame || !hasPhoto || previewFailed) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    function update() {
      setPageVisible(!document.hidden)
      setReducedMotion(motion.matches)
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25),
      { threshold: [0, 0.25] },
    )
    observer.observe(frame)
    document.addEventListener('visibilitychange', update)
    motion.addEventListener('change', update)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
      motion.removeEventListener('change', update)
    }
  }, [hasPhoto, previewFailed])

  useEffect(() => {
    if (!preview) return
    const timer = setInterval(() => setPosition((current) => 1 - current), 650)
    return () => clearInterval(timer)
  }, [preview])

  return (
    <article
      onPointerEnter={(event) => {
        if (!phoneControls && compact && event.pointerType === 'mouse') setManual(true)
      }}
      onPointerLeave={() => setManual(false)}
      onFocus={(event) => {
        if (
          !phoneControls &&
          compact &&
          event.target instanceof HTMLElement &&
          event.target.matches(':focus-visible')
        )
          setManual(true)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setManual(false)
      }}
      className="bg-panel ring-border flex h-full w-full flex-col overflow-hidden rounded-lg text-left shadow-lg ring-2"
    >
      <div className={`flex w-full flex-col gap-2 ${compact ? 'h-32 shrink-0 p-3' : 'p-4'}`}>
        <span className="bg-accent/15 text-accent inline-flex min-h-10 w-fit max-w-full items-center rounded-full px-3 py-1 text-sm leading-5 font-normal break-words">
          {exercise.group}
        </span>
        <h3
          className={`text-text leading-snug font-normal break-words ${compact ? 'line-clamp-2 min-h-12 text-base' : 'text-lg'}`}
        >
          <button
            type="button"
            onClick={onOpen}
            className="focus-visible:outline-accent min-h-11 w-full text-left focus-visible:outline-2"
          >
            {exercise.name}
          </button>
        </h3>
      </div>
      {hasPhoto && (
        <div ref={photo} className="relative aspect-[3/2] w-full shrink-0 overflow-hidden bg-white">
          <img
            draggable={false}
            src={exercise.thumbnail}
            alt={`${exercise.name}, start position`}
            aria-hidden={shown !== 0}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className={`pointer-events-none absolute inset-0 size-full object-contain ${shown === 0 ? 'opacity-100' : 'opacity-0'}`}
          />
          {preview && (
            <img
              draggable={false}
              src={exercise.thumbnail?.replace('/0.jpg', '/1.jpg')}
              alt={`${exercise.name}, end position`}
              aria-hidden={shown !== 1}
              decoding="async"
              onLoad={() => setEndReady(true)}
              onError={() => {
                setPreviewFailed(true)
              }}
              className={`pointer-events-none absolute inset-0 size-full object-contain ${shown === 1 ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
          {!phoneControls && (
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Open ${exercise.name} guide`}
              className="focus-visible:outline-accent absolute inset-0 focus-visible:outline-2"
            />
          )}
        </div>
      )}
      {!hasPhoto && compact && (
        <div className="bg-accent/5 text-muted flex aspect-[3/2] w-full shrink-0 flex-col items-center justify-center gap-2 px-2 text-center">
          <ChartNoAxesCombined className="text-accent size-7" aria-hidden />
          <span className="text-sm">History & progress</span>
        </div>
      )}
      <div className={`mt-auto flex w-full flex-col gap-3 ${compact ? 'p-3' : 'p-4'}`}>
        {!hasPhoto && !compact && (
          <p className="text-muted text-base">View your training history and progress.</p>
        )}
        <div className="flex items-center justify-end gap-2">
          {phoneControls && compact && hasPhoto && !previewFailed && (
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={`${playing ? 'Pause' : 'Play'} ${exercise.name} preview`}
              aria-pressed={playing}
              className="border-accent/50 bg-accent/10 text-accent focus-visible:outline-accent inline-flex size-11 shrink-0 items-center justify-center rounded-full border focus-visible:outline-2"
            >
              {playing ? (
                <Pause className="size-5" aria-hidden />
              ) : (
                <Play className="size-5" aria-hidden />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${exercise.name} guide`}
            className="border-accent/50 bg-accent/10 text-accent inline-flex min-h-11 w-fit items-center justify-center gap-1 self-end rounded-full border px-2 text-sm font-normal"
          >
            {hasPhoto ? 'Open guide' : 'View exercise'}
            {!compact && <ArrowUpRight className="size-4 shrink-0" aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  )
}

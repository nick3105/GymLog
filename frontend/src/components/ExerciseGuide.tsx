import { useEffect, useState } from 'react'

import { api, ApiError } from '../api'
import { photoAlt } from '../exerciseLibrary'
import type { ExerciseGuide as Guide } from '../types'

// REV-10: how an exercise is done — start and end photos taking turns, then numbered steps.
export default function ExerciseGuide({ exerciseId, name }: { exerciseId: string; name: string }) {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [problem, setProblem] = useState('')
  const [shown, setShown] = useState(0)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    let current = true
    api<Guide>(`exercises/${encodeURIComponent(exerciseId)}/guide`)
      .then((result) => current && setGuide(result))
      .catch((error: Error) => {
        if (!current) return
        // A coachee's own exercise is not in the coach's catalogue: that just means no guide.
        if (error instanceof ApiError && error.status === 404) setGuide({ steps: [], images: [] })
        else setProblem(error.message)
      })
    return () => {
      current = false
    }
  }, [exerciseId])

  const animated = !reduceMotion && guide !== null && guide.images.length === 2
  useEffect(() => {
    if (!animated) return
    // Swap photos every second, like a slow GIF.
    const timer = window.setInterval(() => setShown((index) => 1 - index), 1000)
    return () => window.clearInterval(timer)
  }, [animated])

  if (problem) return <p className="text-danger text-sm font-normal">{problem}</p>
  if (!guide) return <p className="text-muted">Loading…</p>

  return (
    <section aria-labelledby="guide-title" className="flex flex-col gap-3">
      <h3 id="guide-title" className="text-label text-xs font-normal tracking-widest uppercase">
        How to do it
      </h3>
      {guide.steps.length === 0 ? (
        <p className="text-muted">No guide yet for this exercise.</p>
      ) : (
        <>
          {animated ? (
            <div className="bg-panel relative aspect-[3/2] w-full overflow-hidden rounded-lg">
              {guide.images.map((image, index) => (
                <img
                  key={image}
                  src={image}
                  alt={photoAlt(name, index)}
                  aria-hidden={index !== shown}
                  className={`absolute inset-0 size-full object-cover ${index === shown ? 'opacity-100' : 'opacity-0'}`}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {guide.images.map((image, index) => (
                <img
                  key={image}
                  src={image}
                  alt={photoAlt(name, index)}
                  className="bg-panel aspect-[3/2] w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}
          <ol className="flex list-decimal flex-col gap-2 pl-6 text-base">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="text-muted text-sm">Photos and steps: free-exercise-db (public domain).</p>
        </>
      )}
    </section>
  )
}

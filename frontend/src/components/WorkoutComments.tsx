import { useEffect, useRef, useState, type FormEvent } from 'react'

import { useLocation } from 'react-router'

import { api, ApiError } from '../api'
import { newId } from '../newId'
import { card, errorText, secondaryButton } from '../ui'

type Comment = { id: number; author: string; text: string; createdAt: string }
type Thread = { comments: Comment[] }

export default function WorkoutComments({ path }: { path: string }) {
  const { hash } = useLocation()
  const section = useRef<HTMLElement>(null)
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [text, setText] = useState('')
  const [clientId, setClientId] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const [problem, setProblem] = useState('')

  useEffect(() => {
    let active = true
    api<Thread>(path)
      .then(({ comments: entries }) => {
        if (active) setComments(entries)
      })
      .catch((error: Error) => {
        if (active) {
          setComments(null)
          setProblem(error.message)
        }
      })
    return () => {
      active = false
    }
  }, [path, reload])

  useEffect(() => {
    if (hash === '#workout-comments') section.current?.scrollIntoView()
  }, [hash])

  async function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !text.trim()) return
    setBusy(true)
    setProblem('')
    const id = clientId || newId()
    setClientId(id)
    try {
      const { comments: entries } = await api<Thread>(path, { text, clientId: id })
      setComments(entries)
      setText('')
      setClientId('')
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setComments(null)
      setProblem((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      ref={section}
      id="workout-comments"
      className={`${card} mt-4 scroll-mt-16`}
      aria-label="Workout comments"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-normal">Comments</h2>
        <button
          type="button"
          className={secondaryButton}
          disabled={busy || (!comments && !problem)}
          onClick={() => {
            setComments(null)
            setProblem('')
            setReload(reload + 1)
          }}
        >
          Refresh comments
        </button>
      </div>
      {problem && (
        <p role="alert" className={`${errorText} mt-2`}>
          {problem}
        </p>
      )}
      {!comments && !problem && <p role="status">Loading comments…</p>}
      {comments && (
        <>
          {comments.length === 0 && <p className="text-muted">No comments yet.</p>}
          <ul className="divide-border divide-y">
            {comments.map((comment) => (
              <li key={comment.id} className="py-2">
                <p className="font-normal wrap-break-word">{comment.author}</p>
                <p className="wrap-break-word whitespace-pre-wrap">{comment.text}</p>
              </li>
            ))}
          </ul>
          <form onSubmit={post} className="mt-3 flex flex-col gap-2">
            <label htmlFor="workout-comment" className="font-normal">
              Write a comment
            </label>
            <p className="text-muted text-sm">
              Visible to everyone who has access to this workout.
            </p>
            <textarea
              id="workout-comment"
              className="border-border bg-ink focus:border-accent min-h-20 w-full rounded-xl border p-3 text-base"
              maxLength={500}
              value={text}
              disabled={busy}
              onChange={(event) => {
                setText(event.target.value)
                setClientId('')
              }}
            />
            <button className={`${secondaryButton} self-start`} disabled={busy || !text.trim()}>
              {busy ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        </>
      )}
    </section>
  )
}

import { Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router'

import { api } from '../api'
import { conversationFor, type AssistantReply, type ChatMessage } from '../assistant'
import { useJournal } from '../journal'
import { input, secondaryButton, textButton } from '../ui'
import AssistantWorkout from './AssistantWorkout'

type Setup = { enabled: boolean; configured: boolean }

export default function Assistant() {
  const { assistantDraft } = useJournal()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [consent, setConsent] = useState(false)
  const [shareDraft, setShareDraft] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [setup, setSetup] = useState<Setup | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const bubble = useRef<HTMLButtonElement>(null)
  const messageInput = useRef<HTMLInputElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const mounted = useRef(true)
  const needsActionSpace =
    location.pathname === '/create' ||
    location.pathname === '/session' ||
    location.pathname.endsWith('/edit')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (open) dialog.current?.showModal()
    else if (dialog.current?.open) {
      dialog.current.close()
      bubble.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    let current = true
    api<Setup>('assistant/status')
      .then((result) => {
        if (current) setSetup(result)
      })
      .catch((error: Error) => {
        if (current) setProblem(error.message)
      })
    return () => {
      current = false
    }
  }, [open])

  useEffect(() => {
    if (open && messages.length) end.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy, open])

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!question.trim() || busy || !consent) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: question.trim() }]
    setBusy(true)
    setProblem('')
    try {
      const result = await api<AssistantReply>('assistant', {
        consent,
        messages: conversationFor(next),
        draft: shareDraft ? assistantDraft : null,
      })
      if (!mounted.current) return
      setMessages([...next, { role: 'assistant', content: result.reply, plans: result.plans }])
      setQuestion('')
    } catch (error) {
      if (mounted.current) setProblem((error as Error).message)
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  function startOver() {
    if (messages.length && !window.confirm('Clear this conversation? Saved workouts will stay.'))
      return
    setMessages([])
    setQuestion('')
    setProblem('')
    setShareDraft(false)
  }

  const ready = setup?.enabled && setup.configured

  return (
    <>
      <button
        ref={bubble}
        type="button"
        aria-label="Open training assistant"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`gradient-border text-accent fixed right-4 z-50 flex size-14 items-center justify-center rounded-full shadow-lg ${needsActionSpace ? 'bottom-[calc(12rem+env(safe-area-inset-bottom))] md:bottom-24' : 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6'}`}
      >
        <Sparkles className="size-7" aria-hidden />
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="assistant-title"
        onCancel={(event) => {
          event.preventDefault()
          setOpen(false)
        }}
        className="bg-ink text-text backdrop:bg-ink/70 fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-none border-0 p-0 sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(44rem,calc(100dvh-2rem))] sm:w-[26rem] sm:rounded-lg"
      >
        <div className="flex h-full min-w-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <header className="border-border flex shrink-0 items-center gap-2 border-b px-4 py-2">
            <Sparkles className="text-accent size-6 shrink-0" aria-hidden />
            <h2 id="assistant-title" className="min-w-0 flex-1 text-lg font-normal">
              Training assistant
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-3">
            {!consent ? (
              <div className="flex flex-col gap-4">
                <p className="text-xl">A little help with your next workout.</p>
                <p>Create a routine, check your plan or ask a quick training question.</p>
                <p className="text-label">
                  When you send, your chat and saved workout templates go to Requesty and its model
                  host. Avoid medical or personal details you do not want to share.
                </p>
                <p className="text-label">
                  Only tick “Share current draft” to include unsaved edits. AI can be wrong. Review
                  suggestions before saving.
                </p>
                <button type="button" onClick={() => setConsent(true)} className={secondaryButton}>
                  Agree & continue
                </button>
              </div>
            ) : (
              <>
                <p className="text-label">Short answers. Your whole training week in mind.</p>
                {!messages.length && (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      className={secondaryButton}
                      onClick={() => {
                        setQuestion(
                          'Help me build a weekly training plan. Ask me what you need to know first.',
                        )
                        messageInput.current?.focus()
                      }}
                    >
                      Build my training plan
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={secondaryButton}
                      onClick={() => {
                        setQuestion(
                          'Review my workout plan in the context of my whole training week. Ask what else I train.',
                        )
                        messageInput.current?.focus()
                      }}
                    >
                      Check my workout
                    </button>
                    <p className="text-label">
                      Saved workouts are available as context. Tell me which ones you actually do
                      each week.
                    </p>
                  </div>
                )}
                <div
                  role="log"
                  aria-label="Assistant conversation"
                  aria-live="polite"
                  className="flex flex-col gap-4"
                >
                  {messages.map((message, index) => (
                    <div key={index} className="flex min-w-0 flex-col gap-3">
                      <div
                        className={`rounded-lg p-3 ${message.role === 'user' ? 'bg-accent/10 ml-6' : 'bg-panel mr-2'}`}
                      >
                        <p className="text-label mb-1 font-normal">
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </p>
                        <p className="wrap-anywhere whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.plans?.map((workout, planIndex) => (
                        <AssistantWorkout key={planIndex} workout={workout} />
                      ))}
                    </div>
                  ))}
                </div>
                {busy && (
                  <p role="status" className="text-label">
                    Thinking about your week…
                  </p>
                )}
              </>
            )}
            {setup && !ready && (
              <p className="text-label">
                Local setup:{' '}
                {setup.enabled
                  ? 'set REQUESTY_API_KEY'
                  : 'set GYMLOG_AI_ENABLED=1 and REQUESTY_API_KEY'}{' '}
                in the backend terminal, then restart Flask. See docs/AI_ASSISTANT.md.
              </p>
            )}
            <div ref={end} />
          </div>

          {consent && (
            <form
              onSubmit={send}
              className="border-border flex shrink-0 flex-col gap-2 border-t px-4 pt-2 pb-3"
            >
              {assistantDraft && (
                <label className="text-label flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={shareDraft}
                    disabled={busy}
                    onChange={(event) => setShareDraft(event.target.checked)}
                    className="accent-accent size-5 shrink-0"
                  />
                  <span className="wrap-anywhere">Share current draft: {assistantDraft.name}</span>
                </label>
              )}
              {problem && (
                <p role="alert" className="text-danger wrap-anywhere">
                  {problem}
                </p>
              )}
              <div className="flex items-center gap-2">
                <label htmlFor="assistant-message" className="sr-only">
                  Message the training assistant
                </label>
                <input
                  ref={messageInput}
                  id="assistant-message"
                  className={input}
                  value={question}
                  maxLength={2000}
                  disabled={busy}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about your training…"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={!ready || !question.trim() || busy}
                  className="bg-accent text-ink flex size-12 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
                >
                  <Send className="size-5" aria-hidden />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={startOver} disabled={busy} className={textButton}>
                  New chat
                </button>
                <span className="text-label">Free AI · check suggestions</span>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  )
}

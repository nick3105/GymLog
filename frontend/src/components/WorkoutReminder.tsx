import { card } from '../ui'

type Props = {
  title: string
  text?: string
  done?: boolean
  disabled?: boolean
  onChange?: (done: boolean) => void
}

export default function WorkoutReminder({
  title,
  text,
  done = false,
  disabled = false,
  onChange,
}: Props) {
  if (!text) return null
  return (
    <section className={card}>
      <h2 className="mb-2 text-lg font-normal">{title}</h2>
      <p className="break-words whitespace-pre-wrap">{text}</p>
      <label className="mt-2 flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          aria-label={`${title} done`}
          checked={done}
          disabled={disabled || !onChange}
          onChange={(event) => onChange?.(event.target.checked)}
          className="accent-accent size-6"
        />
        {done ? 'Done' : onChange ? 'Mark done' : 'Not done'}
      </label>
    </section>
  )
}

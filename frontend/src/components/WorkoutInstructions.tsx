import { input, label } from '../ui'

type Props = {
  warmup: string
  cooldown: string
  onChange: (field: 'warmup' | 'cooldown', value: string) => void
  disabled?: boolean
}

export default function WorkoutInstructions({
  warmup,
  cooldown,
  onChange,
  disabled = false,
}: Props) {
  return (
    <div className="grid gap-4">
      {(['warmup', 'cooldown'] as const).map((field) => {
        const value = field === 'warmup' ? warmup : cooldown
        const count = Array.from(value).length
        return (
          <label key={field} className={label}>
            {field === 'warmup' ? 'Warmup' : 'Cooldown'} · optional
            <textarea
              value={value}
              disabled={disabled}
              onChange={(event) => onChange(field, event.target.value)}
              className={`${input} mt-2 min-h-24 resize-y rounded-lg tracking-normal normal-case`}
              aria-label={field === 'warmup' ? 'Warmup' : 'Cooldown'}
              aria-describedby={`${field}-count`}
              aria-invalid={count > 100}
              rows={2}
            />
            <span
              id={`${field}-count`}
              className={`mt-1 block text-sm tracking-normal normal-case ${count > 100 ? 'text-danger' : 'text-muted'}`}
            >
              {count}/100 characters
            </span>
          </label>
        )
      })}
    </div>
  )
}

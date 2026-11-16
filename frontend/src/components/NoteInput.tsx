import { input } from '../ui'

type Props = {
  label: string
  value: string
  maximum: number
  onChange: (value: string) => void
  disabled?: boolean
}

export default function NoteInput({ label, value, maximum, onChange, disabled }: Props) {
  return (
    <label className="mt-3 block">
      <span className="text-muted mb-1 block">{label}</span>
      <textarea
        value={value}
        aria-label={label}
        rows={2}
        disabled={disabled}
        onChange={(event) => onChange(Array.from(event.target.value).slice(0, maximum).join(''))}
        className={`${input} min-h-20 rounded-lg`}
      />
      <span className="text-muted block text-right text-sm">
        {Array.from(value).length}/{maximum}
      </span>
    </label>
  )
}

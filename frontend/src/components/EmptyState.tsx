import { Link } from 'react-router'

import { primaryButton } from '../ui'

type Props = { title: string; text: string; to: string; action: string }

// What a page shows before there is anything to show, with the one step that fills it.
export default function EmptyState({ title, text, to, action }: Props) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-10 text-center">
      <h2 className="text-xl font-normal">{title}</h2>
      <p className="text-muted">{text}</p>
      <Link to={to} className={primaryButton}>
        {action}
      </Link>
    </div>
  )
}

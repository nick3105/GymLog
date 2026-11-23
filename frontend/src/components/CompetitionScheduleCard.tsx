import { workoutKinds, type CompetitionScheduleEntry } from '../competition'
import { card } from '../ui'

export default function CompetitionScheduleCard({ entry }: { entry: CompetitionScheduleEntry }) {
  if (entry.kind === 'event')
    return (
      <article className={card}>
        <p className="text-accent font-normal">Competition day</p>
        <h3 className="text-lg font-normal wrap-anywhere">{entry.name}</h3>
      </article>
    )
  return (
    <article className={card}>
      <p className="text-accent wrap-anywhere">
        {entry.eventName} · Day {entry.position}
      </p>
      <h3 className="text-lg font-normal wrap-anywhere">{entry.name}</h3>
      <p className="text-muted">
        {workoutKinds[entry.kind]} · {entry.minutes} min
      </p>
      <details className="mt-1">
        <summary className="text-accent min-h-11 cursor-pointer py-3">View workout steps</summary>
        <p className="mb-2 wrap-anywhere">{entry.focus}</p>
        <ol className="list-decimal space-y-1 pl-5">
          {entry.steps.map((step, index) => (
            <li key={index} className="wrap-anywhere">
              {step}
            </li>
          ))}
        </ol>
      </details>
    </article>
  )
}

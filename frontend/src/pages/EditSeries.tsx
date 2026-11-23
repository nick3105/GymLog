import { Link, useParams, useSearchParams } from 'react-router'

import ScheduleProblem from '../components/ScheduleProblem'
import SeriesForm from '../components/SeriesForm'
import { today } from '../format'
import { secondaryButton } from '../ui'
import { useSchedule } from '../useSchedule'

export default function EditSeries() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const week = params.get('week') ?? today()
  const { state, problem, reload } = useSchedule(week)
  const isNew = id === 'new'
  const original = state?.series.find((item) => item.id === id)

  return (
    <>
      <h1 className="gradient-text mb-4 text-3xl font-bold">
        {isNew ? 'Create series' : 'Edit series'}
      </h1>
      <ScheduleProblem message={problem} retry={reload} />
      {!state && !problem && <p role="status">Loading series…</p>}
      {state && (isNew || original) && (
        <SeriesForm key={id} week={week} revision={state.revision} original={original} />
      )}
      {state && !isNew && !original && (
        <>
          <p role="alert" className="mb-3">
            That workout series could not be found.
          </p>
          <Link to={'/schedule/series?week=' + week} className={secondaryButton}>
            Back to workout series
          </Link>
        </>
      )}
    </>
  )
}

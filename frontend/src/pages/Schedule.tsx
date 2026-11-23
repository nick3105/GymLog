import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router'

import Notice from '../components/Notice'
import CompetitionScheduleCard from '../components/CompetitionScheduleCard'
import ScheduleProblem from '../components/ScheduleProblem'
import ScheduledWorkoutCard from '../components/ScheduledWorkoutCard'
import { formatDay, today } from '../format'
import { entriesForDay, scheduleActionBar, scheduleMonday, shiftScheduleDay } from '../schedule'
import { input, primaryButton, secondaryButton, textButton } from '../ui'
import { useSchedule } from '../useSchedule'

export default function Schedule() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('week') ?? today()
  const { key } = useLocation()
  const { state, problem, reload } = useSchedule(requested, key)

  const week = state?.week
  const days = week ? Array.from({ length: 7 }, (_, index) => shiftScheduleDay(week, index)) : []

  const competition = state?.competitionEntries ?? []
  const competitionWorkouts = competition.filter((entry) => entry.kind !== 'event').length

  return (
    <>
      <Notice />
      <h1 className="gradient-text mb-2 text-3xl font-bold">Schedule</h1>
      <p className="text-muted mb-4">Plan a date, or keep your training week flexible.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link to={'/schedule/series?week=' + (week ?? today())} className={secondaryButton}>
          Workout series
        </Link>
        <Link to="/schedule/competition-prep" className={secondaryButton}>
          Competition prep
        </Link>
        <button
          type="button"
          className={textButton}
          onClick={() => setParams({ week: scheduleMonday(today()) })}
        >
          Today
        </button>
      </div>
      <label className="mb-4 block">
        Jump to a week
        <input
          aria-label="Jump to a week"
          type="date"
          min="1999-12-27"
          max="2100-12-31"
          value={week ?? ''}
          className={`${input} mt-1`}
          onChange={(event) => {
            if (event.target.value) setParams({ week: event.target.value })
          }}
        />
      </label>
      <ScheduleProblem message={problem} retry={reload} />
      {!state && !problem && <p role="status">Loading your schedule…</p>}
      {state && week && (
        <>
          <div className="mb-4 flex items-center justify-between gap-2">
            <button
              aria-label="Previous week"
              disabled={week === '1999-12-27'}
              className={textButton + ' min-w-11 justify-center'}
              onClick={() => setParams({ week: shiftScheduleDay(week, -7) })}
            >
              <ChevronLeft aria-hidden />
            </button>
            <h2 className="text-center text-lg font-normal">
              {formatDay(week)} – {formatDay(shiftScheduleDay(week, 6))}
            </h2>
            <button
              aria-label="Next week"
              disabled={week === '2100-12-27'}
              className={textButton + ' min-w-11 justify-center'}
              onClick={() => setParams({ week: shiftScheduleDay(week, 7) })}
            >
              <ChevronRight aria-hidden />
            </button>
          </div>
          <p className="text-muted mb-4">
            {state.entries.length + competitionWorkouts} workouts planned.
          </p>
          {[null, ...days].map((day) => (
            <section
              key={day ?? 'flexible'}
              className="mb-6"
              aria-label={day ? formatDay(day) : 'Any day this week'}
            >
              <h2 className="mb-2 flex items-center gap-2 text-lg font-normal">
                <CalendarDays className="text-accent size-5" aria-hidden />
                {day
                  ? new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Any day this week'}
              </h2>
              <div className="flex flex-col gap-3">
                {entriesForDay(state.entries, day).map((entry) => (
                  <ScheduledWorkoutCard key={entry.id} entry={entry} />
                ))}
                {competition
                  .filter((entry) => entry.day === day)
                  .map((entry) => (
                    <CompetitionScheduleCard key={entry.id} entry={entry} />
                  ))}
                {entriesForDay(state.entries, day).length === 0 &&
                  !competition.some((entry) => entry.day === day) && (
                    <p className="text-muted py-2">Nothing planned.</p>
                  )}
              </div>
            </section>
          ))}
          <div className={scheduleActionBar}>
            <Link to={`/schedule/add?week=${week}`} className={`${primaryButton} w-full`}>
              Add to schedule
            </Link>
          </div>
        </>
      )}
    </>
  )
}

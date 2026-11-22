import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { formatDay } from '../format'
import { useJournal } from '../journal'
import { card, secondaryButton } from '../ui'

function isoDay(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function Calendar() {
  const { journal } = useJournal()
  const [today] = useState(() => new Date())
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const leadingDays = new Date(year, monthIndex, 1).getDay() || 7
  const sessionsByDay = new Map(journal.sessions.map((session) => [session.day, session]))
  const selectedSessions = selectedDay
    ? journal.sessions.filter((session) => session.day === selectedDay)
    : []
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const monthSessions = journal.sessions.filter((session) => session.day.startsWith(monthPrefix))
  const todayDay = isoDay(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="gradient-text text-3xl font-bold">Training calendar</h1>
        <Link to="/review" className={secondaryButton}>
          Review
        </Link>
      </div>
      <section className={card} aria-label="Training calendar">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            className={secondaryButton}
            aria-label="Previous month"
            onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
          >
            <ChevronLeft aria-hidden />
          </button>
          <div className="text-center">
            <h2 className="font-normal">
              {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-muted text-sm">
              {monthSessions.length} {monthSessions.length === 1 ? 'workout' : 'workouts'} this
              month
            </p>
          </div>
          <button
            type="button"
            className={secondaryButton}
            aria-label="Next month"
            onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
          >
            <ChevronRight aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day} className="text-muted py-2 font-normal">
              {day}
            </span>
          ))}
          {Array.from({ length: leadingDays - 1 }, (_, index) => (
            <span key={`empty-${index}`} aria-hidden />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = isoDay(year, monthIndex, index + 1)
            const hasSession = sessionsByDay.has(day)
            const selected = selectedDay === day
            const isToday = day === todayDay
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`min-h-12 rounded-lg p-2 font-mono ${selected ? 'bg-accent text-ink' : isToday ? 'ring-accent bg-panel text-text ring-2' : hasSession ? 'bg-ink text-accent' : 'text-text'}`}
                aria-label={`${index + 1}${hasSession ? ', workout logged' : ''}`}
              >
                {index + 1}
                {hasSession && (
                  <span className="mx-auto mt-1 block size-1.5 rounded-full bg-current" />
                )}
              </button>
            )
          })}
        </div>
      </section>
      {selectedDay && (
        <section className={`${card} mt-4`} aria-label={`Workouts on ${selectedDay}`}>
          <h2 className="mb-2 font-normal">{formatDay(selectedDay)}</h2>
          {selectedSessions.length === 0 ? (
            <p className="text-muted">No workout logged on this day.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/review/${session.id}`}
                  className="bg-ink rounded-lg p-3"
                >
                  {session.name}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  )
}

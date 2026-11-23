import {
  competitionSports,
  preparationStages,
  workoutKinds,
  type CompetitionDraft,
  type CompetitionWorkout,
} from '../competition'
import { formatDay } from '../format'
import { card, input, primaryButton, textButton } from '../ui'

export default function CompetitionPreview({
  draft,
  busy,
  onEdit,
  onRemove,
  onSave,
  onBack,
}: {
  draft: CompetitionDraft
  busy: boolean
  onEdit: (week: number, workout: number, value: CompetitionWorkout) => void
  onRemove: (week: number, workout: number) => void
  onSave: () => void
  onBack: () => void
}) {
  const limit = draft.intake.minutesPerSession
  const valid = draft.plan.weeks.every((week) =>
    week.sessions.every(
      (workout) =>
        workout.name.trim() &&
        Number.isInteger(workout.minutes) &&
        workout.minutes >= 1 &&
        workout.minutes <= limit &&
        workout.steps.every((step) => step.trim()),
    ),
  )

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h3 className="text-xl font-normal break-words">{draft.intake.eventName}</h3>
        <p>
          {competitionSports[draft.intake.sport]} · {formatDay(draft.intake.eventDate)}
        </p>
        <p className="text-muted">
          {preparationStages[draft.intake.stage]} · Up to {draft.intake.sessionsPerWeek} sessions a
          week
        </p>
        <p className="mt-2 wrap-anywhere">{draft.plan.summary}</p>
      </div>

      {draft.plan.weeks.map((week, weekIndex) => (
        <details key={week.week} className={card + ' py-1'}>
          <summary className="min-h-11 cursor-pointer py-3 font-normal">
            Week {weekIndex + 1} · {formatDay(week.week)}
            <span className="text-muted ml-2">{week.sessions.length} workouts</span>
          </summary>
          <p className="mb-2 wrap-anywhere">{week.focus}</p>
          {draft.existing[week.week] > 0 && (
            <p className="text-accent mb-2">
              Already scheduled this week: {draft.existing[week.week]}.
            </p>
          )}
          {week.sessions.length === 0 && (
            <p className="text-muted pb-3">No training sessions planned.</p>
          )}
          <ol className="space-y-3 pb-3">
            {week.sessions.map((workout, workoutIndex) => (
              <li key={workoutIndex} className="bg-ink rounded-lg p-3">
                <p className="text-accent mb-1 font-normal">
                  {workout.day ? formatDay(workout.day) : 'Any day · Day ' + (workoutIndex + 1)}
                </p>
                <h4 className="text-lg font-normal wrap-anywhere">{workout.name}</h4>
                <p className="text-muted">
                  {workoutKinds[workout.kind]} · {workout.minutes} min
                </p>
                <ol className="my-2 list-decimal space-y-1 pl-5">
                  {workout.steps.map((step, index) => (
                    <li key={index} className="wrap-anywhere">
                      {step}
                    </li>
                  ))}
                </ol>
                <details>
                  <summary className="text-accent min-h-11 cursor-pointer py-3">Edit workout</summary>
                  <label className="mb-2 block">
                    Workout name
                    <input
                      className={input + ' mt-1'}
                      value={workout.name}
                      maxLength={60}
                      disabled={busy}
                      onChange={(event) =>
                        onEdit(weekIndex, workoutIndex, { ...workout, name: event.target.value })
                      }
                    />
                  </label>
                  <label className="mb-2 block">
                    Minutes
                    <input
                      className={input + ' mt-1'}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={limit}
                      value={workout.minutes || ''}
                      disabled={busy}
                      onChange={(event) =>
                        onEdit(weekIndex, workoutIndex, {
                          ...workout,
                          minutes: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  {workout.steps.map((step, index) => (
                    <label key={index} className="mb-2 block">
                      Step {index + 1}
                      <input
                        className={input + ' mt-1'}
                        value={step}
                        maxLength={150}
                        disabled={busy}
                        onChange={(event) =>
                          onEdit(weekIndex, workoutIndex, {
                            ...workout,
                            steps: workout.steps.map((value, at) =>
                              at === index ? event.target.value : value,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className={textButton + ' text-danger'}
                    disabled={busy}
                    onClick={() => onRemove(weekIndex, workoutIndex)}
                  >
                    Remove workout from preview
                  </button>
                </details>
              </li>
            ))}
          </ol>
        </details>
      ))}
      <p className="text-muted">Competition day · {formatDay(draft.intake.eventDate)}</p>
      {!valid && (
        <p className="text-danger">
          Fill in each workout name and step, with minutes between 1 and {limit}.
        </p>
      )}
      <div className="bg-ink/95 sticky bottom-0 z-10 space-y-2 py-3 backdrop-blur">
        <button
          type="button"
          className={primaryButton + ' w-full'}
          disabled={busy || !valid}
          onClick={onSave}
        >
          Save plan to Schedule
        </button>
        <button type="button" className={textButton} disabled={busy} onClick={onBack}>
          Edit preparation answers
        </button>
      </div>
    </div>
  )
}

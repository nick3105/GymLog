import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

import { api } from '../api'
import StatTile from '../components/StatTile'
import { formatDay, formatNumber, today } from '../format'
import { useJournal } from '../journal'
import { formatDuration, formatLifted } from '../profile'
import type { Profile as ProfileData } from '../types'
import { card, primaryButton, textButton } from '../ui'

// A titled card of numbers, two per row on a phone.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={card} aria-label={title}>
      <h2 className="mb-3 font-normal">{title}</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">{children}</div>
    </section>
  )
}

function plural(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`
}

// "–" stands for "nothing to show yet".
function maybe(value: number | null, format: (value: number) => string): string {
  return value === null ? '–' : format(value)
}

// REV-11: level and statistics, all calculated by the API from the user's own journal.
export default function Profile() {
  const { username, journal } = useJournal()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [problem, setProblem] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [editingBio, setEditingBio] = useState(false)
  const [savingBio, setSavingBio] = useState(false)

  useEffect(() => {
    let current = true
    api<ProfileData>(`profile?today=${today()}`)
      .then((result) => {
        if (!current) return
        setProfile(result)
        setBio(result.bio)
        setAvatar(result.avatar)
      })
      .catch((error: Error) => current && setProblem(error.message))
    return () => {
      current = false
    }
  }, [journal.sessions, journal.weights])

  async function saveBio(event: FormEvent) {
    event.preventDefault()
    setSavingBio(true)
    setProblem('')
    try {
      const result = await api<{ bio: string; avatar: string | null }>('profile', { bio, avatar })
      setBio(result.bio)
      setAvatar(result.avatar)
      setProfile((current) =>
        current ? { ...current, bio: result.bio, avatar: result.avatar } : current,
      )
      setEditingBio(false)
    } catch (error) {
      setProblem((error as Error).message)
    } finally {
      setSavingBio(false)
    }
  }

  return (
    <>
      <h1 className="gradient-text mb-4 text-3xl font-bold">Your profile</h1>
      <div className="mb-4 flex flex-col items-center gap-2 text-center">
        {avatar ? (
          <img src={avatar} alt="" className="size-24 rounded-full object-cover" />
        ) : (
          <span
            className="from-gradient-start to-gradient-end flex size-24 items-center justify-center rounded-full bg-linear-to-tr text-4xl font-normal text-white uppercase"
            aria-hidden
          >
            {username.charAt(0)}
          </span>
        )}
        <p className="text-xl font-normal">{username}</p>
        {profile && (
          <>
            <p className="gradient-border rounded-full px-4 py-1 font-normal">
              {profile.level.name} level
            </p>
            <p className="text-muted text-sm">
              {profile.level.next === null
                ? 'Top level'
                : `${plural(profile.level.toNextLevel ?? 0, 'workout')} to ${profile.level.next}`}
            </p>
          </>
        )}
      </div>
      {problem && <p className="text-danger text-sm font-normal">{problem}</p>}
      <section className={`${card} mb-4`} aria-label="About you">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-normal">About you</h2>
          <button
            type="button"
            onClick={() => setEditingBio((current) => !current)}
            className={textButton}
          >
            {editingBio ? 'Cancel' : 'Edit bio'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className={textButton}>
            {avatar ? 'Change photo' : 'Add photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  if (typeof reader.result === 'string') {
                    setAvatar(reader.result)
                    setEditingBio(true)
                  }
                }
                reader.readAsDataURL(file)
              }}
            />
          </label>
          {avatar && (
            <button type="button" className={textButton} onClick={() => setAvatar(null)}>
              Remove photo
            </button>
          )}
        </div>
        {!editingBio ? (
          <p className="text-muted mt-3 break-words">
            {bio || 'Add a short bio about your training.'}
          </p>
        ) : (
          <form onSubmit={saveBio} className="mt-3 flex flex-col gap-3">
            <label htmlFor="profile-bio" className="text-muted text-sm">
              Short bio
            </label>
            <textarea
              id="profile-bio"
              maxLength={160}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="border-border bg-ink text-text placeholder:text-muted/70 focus:border-accent min-h-24 w-full resize-y rounded-2xl border p-3 text-base focus:outline-none"
              placeholder="e.g. Training for my first half marathon"
            />
            <p className="text-muted text-right text-sm">{bio.length}/160</p>
            <button type="submit" disabled={savingBio} className={primaryButton}>
              {savingBio ? 'Saving…' : 'Save bio'}
            </button>
          </form>
        )}
      </section>
      {!profile && !problem && <p className="text-muted">Loading…</p>}
      {profile && (
        <div className="flex flex-col gap-4">
          <Section title="Overview">
            <StatTile label="Workouts" value={formatNumber(profile.overview.workouts)} />
            <StatTile label="Total lifted" value={formatLifted(profile.overview.liftedKg)} />
            <StatTile label="Sets" value={formatNumber(profile.overview.sets)} />
            <StatTile label="Reps" value={formatNumber(profile.overview.reps)} />
            <StatTile label="Exercises" value={formatNumber(profile.overview.exercises)} />
            <StatTile
              label="Time held"
              value={
                profile.overview.heldSeconds === 0
                  ? '–'
                  : profile.overview.heldSeconds < 60
                    ? `${profile.overview.heldSeconds} s`
                    : formatDuration(profile.overview.heldSeconds)
              }
            />
          </Section>

          <Section title="Consistency">
            <StatTile
              label="Streak"
              value={plural(profile.consistency.currentStreakWeeks, 'week')}
              detail="Weeks in a row with a workout"
            />
            <StatTile
              label="Longest streak"
              value={plural(profile.consistency.longestStreakWeeks, 'week')}
            />
            <StatTile label="This week" value={formatNumber(profile.consistency.thisWeek)} />
            <StatTile label="This month" value={formatNumber(profile.consistency.thisMonth)} />
            <StatTile
              label="Per week"
              value={maybe(profile.consistency.perWeek, formatNumber)}
              detail="Workouts on average"
            />
            <StatTile
              label="Last 30 days"
              value={formatNumber(profile.consistency.trainingDaysLast30)}
              detail="Training days"
            />
          </Section>

          <Section title="Duration">
            {profile.duration.count === 0 ? (
              <p className="text-muted col-span-2">
                No timed workouts yet. From now on, every workout records how long it takes.
              </p>
            ) : (
              <>
                <StatTile
                  label="Average"
                  value={maybe(profile.duration.averageSeconds, formatDuration)}
                />
                <StatTile
                  label="Longest"
                  value={maybe(profile.duration.longestSeconds, formatDuration)}
                />
                <StatTile
                  label="Total"
                  value={formatDuration(profile.duration.totalSeconds)}
                  detail={`${plural(profile.duration.count, 'workout')}`}
                />
                {profile.duration.recordedSince && (
                  <p className="text-muted col-span-2 text-sm">
                    Recorded from {formatDay(profile.duration.recordedSince)}. Older workouts have
                    no duration.
                  </p>
                )}
              </>
            )}
          </Section>

          <Section title="Averages">
            <StatTile
              label="Sets"
              value={maybe(profile.averages.setsPerWorkout, formatNumber)}
              detail="Per workout"
            />
            <StatTile
              label="Weight"
              value={maybe(profile.averages.weightPerSet, (kg) => `${formatNumber(kg)} kg`)}
              detail="Per set with weight"
            />
            <StatTile label="RPE" value={maybe(profile.averages.rpe, formatNumber)} />
          </Section>

          <Section title="Records">
            <StatTile
              label="Heaviest set"
              value={
                profile.records.heaviestSet
                  ? `${formatNumber(profile.records.heaviestSet.weight)} kg`
                  : '–'
              }
              detail={
                profile.records.heaviestSet &&
                `${profile.records.heaviestSet.reps} reps · ${profile.records.heaviestSet.exercise} · ${formatDay(profile.records.heaviestSet.day)}`
              }
            />
            <StatTile
              label="Best est. 1RM"
              value={
                profile.records.best1rm
                  ? `${formatNumber(profile.records.best1rm.estimate)} kg`
                  : '–'
              }
              detail={
                profile.records.best1rm &&
                `${profile.records.best1rm.exercise} · ${formatDay(profile.records.best1rm.day)}`
              }
            />
            <StatTile
              label="Biggest workout"
              value={
                profile.records.biggestWorkout
                  ? formatLifted(profile.records.biggestWorkout.liftedKg)
                  : '–'
              }
              detail={
                profile.records.biggestWorkout &&
                `${profile.records.biggestWorkout.name} · ${formatDay(profile.records.biggestWorkout.day)}`
              }
            />
            <StatTile
              label="Most reps"
              value={profile.records.mostReps ? String(profile.records.mostReps.reps) : '–'}
              detail={
                profile.records.mostReps &&
                `${profile.records.mostReps.exercise} · ${formatDay(profile.records.mostReps.day)}`
              }
            />
          </Section>

          <Section title="Favourites">
            <StatTile
              label="Exercise"
              value={profile.favourites.exercise?.name ?? '–'}
              detail={
                profile.favourites.exercise && plural(profile.favourites.exercise.sets, 'set')
              }
            />
            <StatTile
              label="Workout"
              value={profile.favourites.workout?.name ?? '–'}
              detail={profile.favourites.workout && `${profile.favourites.workout.count} times`}
            />
            <StatTile
              label="Muscle group"
              value={profile.favourites.group?.name ?? '–'}
              detail={profile.favourites.group && plural(profile.favourites.group.sets, 'set')}
            />
          </Section>

          <Section title="Body weight">
            <StatTile
              label="Latest"
              value={
                profile.bodyWeight.latest ? `${formatNumber(profile.bodyWeight.latest.kg)} kg` : '–'
              }
              detail={profile.bodyWeight.latest && formatDay(profile.bodyWeight.latest.day)}
            />
            <StatTile
              label="Change"
              value={maybe(
                profile.bodyWeight.change,
                (kg) => `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${formatNumber(Math.abs(kg))} kg`,
              )}
              detail={profile.bodyWeight.since && `Since ${formatDay(profile.bodyWeight.since)}`}
            />
          </Section>
        </div>
      )}
    </>
  )
}

import { Dumbbell, MessageCircle, Trophy, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { api } from '../api'
import type { FriendsState } from '../friends'
import { card, secondaryButton } from '../ui'

export default function FriendRequestNotice({ username }: { username: string }) {
  const [state, setState] = useState<FriendsState | null>(null)
  const storageKey = `gymlog-seen-workout-shares:${username}`
  const [seen, setSeen] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]')
      return Array.isArray(stored) ? stored.filter((value) => typeof value === 'string') : []
    } catch {
      return []
    }
  })
  const count =
    state?.relationships.filter((entry) => entry.incoming && entry.state === 'pending').length ?? 0
  const unseenWorkouts = state?.activity.filter((entry) => !seen.includes(entry.id)) ?? []
  const [workout] = unseenWorkouts
  const multipleWorkouts = unseenWorkouts.length > 1
  const otherSenders = new Set(unseenWorkouts.map((entry) => entry.sender)).size - 1
  const workoutHeading = workout
    ? otherSenders > 0
      ? `${workout.sender} and ${otherSenders} ${otherSenders === 1 ? 'other' : 'others'} shared workouts`
      : multipleWorkouts
        ? `${workout.sender} shared ${unseenWorkouts.length} workouts`
        : `${workout.sender} shared a workout`
    : ''

  const comment = state?.commentActivity?.find((entry) => !seen.includes(`comment:${entry.id}`))

  const milestone = state?.milestones?.find((entry) => !seen.includes(`milestone:${entry.id}`))
  const congratulations = state?.congratulations?.find(
    (entry) => !seen.includes(`congrats:${entry.id}`),
  )

  function markSeen(...ids: string[]) {
    const next = [...new Set([...ids, ...seen])]
    setSeen(next)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // The notice can still be cleared for the current page.
    }
  }

  useEffect(() => {
    let active = true
    let checking = false

    async function checkFriends() {
      if (document.hidden || checking) return
      checking = true
      try {
        const friends = await api<FriendsState>('friends')
        if (active) setState(friends)
      } catch {
        // A failed refresh leaves the last known count in place until the next check.
      } finally {
        checking = false
      }
    }

    void checkFriends()
    const interval = window.setInterval(checkFriends, 30_000)
    document.addEventListener('visibilitychange', checkFriends)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', checkFriends)
    }
  }, [])

  return (
    <div aria-live="polite">
      {count > 0 && (
        <section
          aria-labelledby="friend-request-title"
          className={`${card} mb-4 flex flex-wrap items-center justify-between gap-3`}
        >
          <h2 id="friend-request-title" className="flex items-center gap-2 font-normal">
            <UserPlus className="text-accent size-5 shrink-0" aria-hidden />
            {count === 1 ? 'New friend request' : `${count} new friend requests`}
          </h2>
          <Link to="/friends" className={secondaryButton}>
            View requests
          </Link>
        </section>
      )}
      {workout && (
        <section
          aria-labelledby="shared-workout-notice-title"
          className={`${card} mb-4 flex flex-wrap items-center justify-between gap-3`}
        >
          <div className="flex min-w-0 items-start gap-2">
            <Dumbbell className="text-accent mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0 wrap-break-word">
              <h2 id="shared-workout-notice-title" className="font-normal">
                {workoutHeading}
              </h2>
              {!multipleWorkouts && <p className="text-muted text-sm">{workout.name}</p>}
            </div>
          </div>
          <Link
            to={
              multipleWorkouts
                ? '/friends#friends-activity'
                : `/friends?sharedWorkout=${encodeURIComponent(workout.id)}`
            }
            onClick={() => markSeen(...unseenWorkouts.map((entry) => entry.id))}
            className={secondaryButton}
          >
            {multipleWorkouts ? 'View workouts' : 'View workout'}
          </Link>
        </section>
      )}
      {comment && (
        <section
          aria-labelledby="workout-comment-notice-title"
          className={`${card} mb-4 flex flex-wrap items-center justify-between gap-3`}
        >
          <div className="flex min-w-0 items-start gap-2">
            <MessageCircle className="text-accent mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0 wrap-break-word">
              <h2 id="workout-comment-notice-title" className="font-normal">
                {comment.author} commented on your workout
              </h2>
              <p className="text-muted text-sm">{comment.workoutName}</p>
            </div>
          </div>
          <Link
            to={`/review/${encodeURIComponent(comment.workoutId)}#workout-comments`}
            onClick={() => markSeen(`comment:${comment.id}`)}
            className={secondaryButton}
          >
            View comments
          </Link>
        </section>
      )}
      {milestone && (
        <section
          aria-labelledby="goal-milestone-notice-title"
          className={`${card} mb-4 flex flex-wrap items-center justify-between gap-3`}
        >
          <h2
            id="goal-milestone-notice-title"
            className="flex min-w-0 items-center gap-2 font-normal wrap-break-word"
          >
            <Trophy className="text-accent size-5 shrink-0" aria-hidden />
            {milestone.sender} reached a personal goal
          </h2>
          <Link
            to={`/friends#goal-${milestone.id}`}
            onClick={() => markSeen(`milestone:${milestone.id}`)}
            className={secondaryButton}
          >
            View milestone
          </Link>
        </section>
      )}
      {congratulations && (
        <section
          aria-labelledby="goal-congratulations-notice-title"
          className={`${card} mb-4 flex flex-wrap items-center justify-between gap-3`}
        >
          <h2
            id="goal-congratulations-notice-title"
            className="flex min-w-0 items-center gap-2 font-normal wrap-break-word"
          >
            <Trophy className="text-accent size-5 shrink-0" aria-hidden />
            {congratulations.sender} congratulated you on reaching your goal
          </h2>
          <Link
            to="/friends#goal-congratulations"
            onClick={() => markSeen(`congrats:${congratulations.id}`)}
            className={secondaryButton}
          >
            View congratulations
          </Link>
        </section>
      )}
    </div>
  )
}

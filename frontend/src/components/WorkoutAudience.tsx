import { useEffect, useState } from 'react'

import { api } from '../api'
import {
  audienceFromSelection,
  type FriendsState,
  type Friendship,
  type WorkoutAudienceSelection,
} from '../friends'
import { input, textButton } from '../ui'

export default function WorkoutAudience({
  selection,
  onChange,
  disabled,
  currentIds,
  label = 'Who can see this workout?',
  allowPrivate = false,
}: {
  selection: WorkoutAudienceSelection
  onChange: (value: WorkoutAudienceSelection) => void
  disabled: boolean
  currentIds: string[]
  label?: string
  allowPrivate?: boolean
}) {
  const [friends, setFriends] = useState<Friendship[] | null>(null)
  const [problem, setProblem] = useState('')
  const [reload, setReload] = useState(0)
  const selecting = selection.audience === 'selected'

  useEffect(() => {
    if (!selecting) return
    let active = true
    api<FriendsState>('friends')
      .then(({ relationships }) => {
        if (active) setFriends(relationships.filter((entry) => entry.state === 'accepted'))
      })
      .catch((error: Error) => {
        if (active) setProblem(error.message)
      })
    return () => {
      active = false
    }
  }, [selecting, reload])

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1 font-normal">{label}</legend>
      <select
        aria-label={label}
        className={input}
        value={selection.audience}
        onChange={(event) => {
          const { value } = event.target
          setFriends(null)
          setProblem('')
          if (value === 'selected') onChange({ audience: 'selected', friendshipIds: currentIds })
          else onChange({ audience: value === 'private' ? 'private' : 'all' })
        }}
      >
        <option value="all">All friends</option>
        <option value="selected">Selected friends</option>
        {allowPrivate && <option value="private">Keep it private</option>}
      </select>
      {selecting && (
        <div className="mt-2 max-h-36 overflow-y-auto">
          {problem ? (
            <>
              <p role="alert">{problem}</p>
              <button
                type="button"
                className={textButton}
                onClick={() => {
                  setProblem('')
                  setReload(reload + 1)
                }}
              >
                Retry friends list
              </button>
            </>
          ) : friends === null ? (
            <p role="status">Loading friends…</p>
          ) : friends.length === 0 ? (
            <p className="text-muted">You have no accepted friends yet.</p>
          ) : (
            friends.map((friend) => (
              <label key={friend.id} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="accent-accent size-5 shrink-0"
                  checked={selection.friendshipIds.includes(friend.id)}
                  onChange={(event) => {
                    const ids = selection.friendshipIds.filter((id) => id !== friend.id)
                    if (event.target.checked) ids.push(friend.id)
                    onChange(
                      allowPrivate && ids.length === 0
                        ? { audience: 'private' }
                        : audienceFromSelection(friends, ids),
                    )
                  }}
                />
                <span className="min-w-0 wrap-break-word">{friend.username}</span>
              </label>
            ))
          )}
        </div>
      )}
    </fieldset>
  )
}

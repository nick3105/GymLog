export type Friendship = {
  id: string
  username: string
  state: 'pending' | 'accepted'
  incoming: boolean
}

export type SharedWorkoutSummary = {
  id: string
  sender: string
  name: string
  day: string
}

export type SharedWorkout = SharedWorkoutSummary & {
  exercises: {
    name: string
    sets: { weight?: number; reps?: number; durationSeconds?: number }[]
  }[]
}

export type GoalMilestone = { id: string; sender: string; congratulated: boolean }
export type GoalCongratulations = { id: string; sender: string }

export type FriendsState = {
  relationships: Friendship[]
  activity: SharedWorkoutSummary[]
  milestones: GoalMilestone[]
  congratulations: GoalCongratulations[]
  commentActivity: { id: number; author: string; workoutId: string; workoutName: string }[]
}

export type WorkoutSharing = {
  friends: Friendship[]
  shares: { id: string; friendshipId: string; username: string }[]
}

export type WorkoutAudienceSelection =
  { audience: 'all' } | { audience: 'selected'; friendshipIds: string[] } | { audience: 'private' }

export function audienceFromSelection(
  friends: Friendship[],
  selectedIds: string[],
): WorkoutAudienceSelection {
  const selected = new Set(selectedIds)
  const friendshipIds = friends
    .filter((friend) => selected.has(friend.id))
    .map((friend) => friend.id)
  return friends.length > 0 && friendshipIds.length === friends.length
    ? { audience: 'all' }
    : { audience: 'selected', friendshipIds }
}

export function audienceFromAccess({ friends, shares }: WorkoutSharing): WorkoutAudienceSelection {
  return audienceFromSelection(
    friends,
    shares.map((share) => share.friendshipId),
  )
}

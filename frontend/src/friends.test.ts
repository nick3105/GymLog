import { expect, test } from 'vitest'

import { audienceFromAccess, audienceFromSelection, type WorkoutSharing } from './friends'

test('the Review audience reflects current access after revoking one friend', () => {
  const access: WorkoutSharing = {
    friends: [
      { id: 'friend-a', username: 'alice', state: 'accepted', incoming: true },
      { id: 'friend-b', username: 'bob', state: 'accepted', incoming: false },
    ],
    shares: [
      { id: 'share-a', friendshipId: 'friend-a', username: 'alice' },
      { id: 'share-b', friendshipId: 'friend-b', username: 'bob' },
    ],
  }

  expect(audienceFromAccess(access)).toEqual({ audience: 'all' })
  expect(audienceFromAccess({ ...access, shares: access.shares.slice(1) })).toEqual({
    audience: 'selected',
    friendshipIds: ['friend-b'],
  })
  expect(audienceFromSelection(access.friends, ['friend-b', 'friend-a'])).toEqual({
    audience: 'all',
  })
  expect(audienceFromAccess({ ...access, shares: [] })).toEqual({
    audience: 'selected',
    friendshipIds: [],
  })
})

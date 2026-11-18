import { describe, expect, it } from 'vitest'

import { conversationFor, type ChatMessage } from './assistant'

describe('assistant conversation', () => {
  it('keeps only the last twelve messages and strips UI properties', () => {
    const messages: ChatMessage[] = Array.from({ length: 15 }, (_, index) => ({
      role: index % 2 ? 'assistant' : 'user',
      content: `Message ${index}`,
    }))
    const result = conversationFor(messages)
    expect(result).toHaveLength(12)
    expect(result[0]).toEqual({ role: 'assistant', content: 'Message 3' })
    expect(result.at(-1)?.content).toBe('Message 14')
  })

  it('keeps suggested workout details available for follow-up questions', () => {
    const result = conversationFor([
      {
        role: 'assistant',
        content: 'Try Monday.',
        plans: [{ name: 'Monday', exercises: [] }],
      },
    ])
    expect(JSON.parse(result[0].content).plans[0].name).toBe('Monday')
  })
})

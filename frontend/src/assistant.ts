import type { Template } from './types'

export type SuggestedWorkout = Pick<Template, 'name' | 'exercises'>
export type AssistantReply = { reply: string; plans: SuggestedWorkout[] }
export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  plans?: SuggestedWorkout[]
}
export type AssistantDraft = {
  name: string
  exercises: {
    id: string
    targets: { reps?: string; weight?: string; durationSeconds?: string; rpe: string }[]
  }[]
}

// Only the last six turns leave the browser. Cards are included so follow-up questions can
// refer to a suggested plan; save state and other UI details never become model messages.
export function conversationFor(messages: ChatMessage[]) {
  return messages.slice(-12).map((message) => ({
    role: message.role,
    content: message.plans?.length
      ? JSON.stringify({ reply: message.content, plans: message.plans }).slice(0, 2000)
      : message.content,
  }))
}

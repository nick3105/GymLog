// The one way the app talks to Flask. Every POST carries the CSRF token from GET /api/session.

let csrf = ''

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function setCsrf(token: string) {
  csrf = token
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const options: RequestInit = {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) {
    options.method = 'POST'
    options.headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }
    options.body = JSON.stringify(body)
  }
  let response: Response
  try {
    response = await fetch(`/api/${path}`, options)
  } catch {
    throw new ApiError('Cannot reach your journal. Check your connection and try again.', 0)
  }
  let result: (T & { error?: string; csrf?: string }) | undefined
  try {
    result = await response.json()
  } catch {
    throw new ApiError('The journal server did not answer correctly. Try again.', response.status)
  }
  if (!response.ok || result === undefined) {
    throw new ApiError(result?.error ?? 'That could not be saved. Try again.', response.status)
  }
  // Signing in or up starts a new session with a new token.
  if (result.csrf) setCsrf(result.csrf)
  return result
}

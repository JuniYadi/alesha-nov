import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { type AuthSession } from '@alesha-nov/auth-web'

export const getServerSessionOrNull = createServerFn({ method: 'GET' }).handler(async (): Promise<AuthSession | null> => {
  const request = getRequest()
  const { getServerSession } = await import('./auth')
  return getServerSession(request)
})

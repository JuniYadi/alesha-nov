import type { AuthApiConfig, AuthSession, LoginInput, PublicUser, SignupInput } from '@alesha-nov/auth-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type AuthUserData = {
  session: AuthSession
  user: PublicUser | null
}

export const AUTH_USER_QUERY_KEY = ["session-user"] as const

const DEFAULT_CONFIG: AuthApiConfig = {
  basePath: '/auth',
}

type NormalizedAuthConfig = Required<Pick<AuthApiConfig, 'basePath'>> & Pick<AuthApiConfig, 'baseUrl'>

function normalizeConfig(config: AuthApiConfig): NormalizedAuthConfig {
  return {
    basePath: config.basePath ?? '/auth',
    baseUrl: config.baseUrl,
  }
}

function buildUrl(path: string, config: AuthApiConfig): string {
  const normalized = normalizeConfig(config)
  if (normalized.baseUrl) {
    return `${normalized.baseUrl.replace(/\/+$/, '')}${normalized.basePath}${path}`
  }

  return `${normalized.basePath}${path}`
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string }
    return payload.error ?? response.statusText ?? 'Request failed'
  } catch {
    return response.statusText || 'Request failed'
  }
}

async function postJson<T>(path: string, body: unknown, config: AuthApiConfig): Promise<T> {
  const response = await fetch(buildUrl(path, config), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json() as Promise<T>
}

async function fetchSession(config: AuthApiConfig): Promise<{ session: AuthSession } | null> {
  const response = await fetch(buildUrl('/session', config), { credentials: 'include' })

  if (!response.ok) {
    return null
  }

  return response.json() as Promise<{ session: AuthSession }>
}

async function fetchMe(config: AuthApiConfig): Promise<{ user: PublicUser } | null> {
  const response = await fetch(buildUrl('/me', config), { credentials: 'include' })

  if (!response.ok) {
    return null
  }

  return response.json() as Promise<{ user: PublicUser }>
}

export async function fetchAuthUser(config: AuthApiConfig = DEFAULT_CONFIG): Promise<AuthUserData | null> {
  const [sessionData, meData] = await Promise.all([fetchSession(config), fetchMe(config)])

  if (!sessionData?.session) {
    return null
  }

  return {
    session: sessionData.session,
    user: meData?.user ?? null,
  }
}

export function authUserQueryOptions(config: AuthApiConfig = DEFAULT_CONFIG) {
  const normalized = normalizeConfig(config)

  return {
    queryKey: [...AUTH_USER_QUERY_KEY, normalized.basePath, normalized.baseUrl ?? ''] as const,
    queryFn: () => fetchAuthUser(normalized),
  }
}

export function useAuthUser(config: AuthApiConfig = DEFAULT_CONFIG) {
  return useQuery(authUserQueryOptions(config))
}

async function invalidateAuthUser(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY })
}

export function useLoginMutation(config: AuthApiConfig = DEFAULT_CONFIG) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const response = await postJson<{ user: PublicUser }>('/login', input, config)
      return response.user
    },
    onSuccess: async () => {
      await invalidateAuthUser(queryClient)
    },
  })
}

export function useSignupMutation(config: AuthApiConfig = DEFAULT_CONFIG) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SignupInput) => {
      const response = await postJson<{ user: PublicUser }>('/signup', input, config)
      return response.user
    },
    onSuccess: async () => {
      await invalidateAuthUser(queryClient)
    },
  })
}

export function useLogoutMutation(config: AuthApiConfig = DEFAULT_CONFIG) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await postJson<Record<string, unknown>>('/logout', {}, config)
    },
    onSuccess: async () => {
      await invalidateAuthUser(queryClient)
    },
  })
}

export function useRevokeSessionMutation(config: AuthApiConfig = DEFAULT_CONFIG) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await postJson<Record<string, unknown>>('/sessions/revoke', {}, config)
    },
    onSuccess: async () => {
      await invalidateAuthUser(queryClient)
    },
  })
}

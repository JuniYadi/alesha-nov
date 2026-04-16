import { createFileRoute } from '@tanstack/react-router'

async function getAuthRouteHandler() {
  const { getAuthHandler } = await import('../../server/auth')
  return getAuthHandler()
}

export const Route = createFileRoute('/auth/$')({
  server: {
    handlers: {
      GET: async ({ request, next }) => {
        const handler = await getAuthRouteHandler()
        const response = await handler(request)
        if (response.status === 404) return next()
        return response
      },
      POST: async ({ request, next }) => {
        const handler = await getAuthRouteHandler()
        const response = await handler(request)
        if (response.status === 404) return next()
        return response
      },
      PUT: async ({ request, next }) => {
        const handler = await getAuthRouteHandler()
        const response = await handler(request)
        if (response.status === 404) return next()
        return response
      },
      DELETE: async ({ request, next }) => {
        const handler = await getAuthRouteHandler()
        const response = await handler(request)
        if (response.status === 404) return next()
        return response
      },
      PATCH: async ({ request, next }) => {
        const handler = await getAuthRouteHandler()
        const response = await handler(request)
        if (response.status === 404) return next()
        return response
      },
      HEAD: async ({ request, next }) => {
        const handler = await getAuthRouteHandler()
        const response = await handler(request)
        if (response.status === 404) return next()
        return response
      },
      OPTIONS: async ({ request, next }) => {
        const handler = await getAuthRouteHandler()
        const response = await handler(request)
        if (response.status === 404) return next()
        return response
      },
    },
  },
})

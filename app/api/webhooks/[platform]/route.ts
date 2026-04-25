import { after } from 'next/server'
import { bot } from '@/lib/bot'
import { logWebhook, logError } from '@/src/core/logger'

type Platform = keyof typeof bot.webhooks

interface RouteContext {
  params: Promise<{ platform: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { platform } = await context.params

  // Log incoming webhook
  logWebhook(platform, 'POST', `/api/webhooks/${platform}`)

  const handler = bot.webhooks[platform as Platform]

  if (!handler) {
    logError('WEBHOOK_RECEIVED', new Error(`Unknown platform: ${platform}`), {
      platform,
      availablePlatforms: Object.keys(bot.webhooks),
    })
    return new Response(`Unknown platform: ${platform}`, { status: 404 })
  }

  try {
    return handler(request, {
      waitUntil: (task) => after(() => task),
    })
  } catch (error) {
    logError('WEBHOOK_RECEIVED', error, { platform })
    return new Response('Internal Server Error', { status: 500 })
  }
}

// Handle GET requests (health check)
export async function GET(request: Request, context: RouteContext) {
  const { platform } = await context.params

  return Response.json({
    status: 'ok',
    platform,
    availablePlatforms: Object.keys(bot.webhooks),
    timestamp: new Date().toISOString(),
  })
}

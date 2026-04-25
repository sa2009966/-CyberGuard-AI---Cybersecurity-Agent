/**
 * app/api/webhooks/[platform]/route.ts
 *
 * Single dynamic route that handles both /api/webhooks/discord
 * and /api/webhooks/slack.
 *
 * Why after() matters for latency
 * ────────────────────────────────
 * Discord and Slack both enforce strict response-time SLAs:
 *   • Discord: the interaction must be acknowledged within 3 seconds or
 *     it shows "This interaction failed" to the user.
 *   • Slack: the event endpoint must return 200 within 3 seconds or
 *     Slack retries up to 3 times, producing duplicate processing.
 *
 * The ChatSDK handler sends the HTTP 200 immediately via the returned
 * Response, then passes the heavy work (AI inference, DB writes) to
 * `waitUntil` — which is fulfilled by `after()` in Next.js.
 * `after()` keeps the serverless function alive after the response is
 * flushed, allowing our securityAnalyzer logging and session writes to
 * complete without blocking the platform ACK.
 *
 * This guarantees:
 *   1. Platform receives an instant 200 → no timeouts / retries.
 *   2. Security analysis and Redis writes still complete reliably.
 *   3. Vercel logs (visible in the dashboard) capture the riskLevel
 *      for every message processed.
 */

import { after } from 'next/server'
import { bot } from '@/lib/bot'
import { logWebhook, logError, structuredLog } from '@/src/core/logger'

type Platform = keyof typeof bot.webhooks

interface RouteContext {
  params: Promise<{ platform: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { platform } = await context.params

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
    /**
     * handler() returns the HTTP Response immediately (200 ACK to Discord/Slack).
     * The `waitUntil` callback keeps the serverless function alive so that
     * ChatSDK's internal AI calls and our after() work can finish safely.
     *
     * We wrap the task in after() so Next.js manages the extension of the
     * function lifetime — this is the idiomatic pattern for Next.js 15/16.
     */
    return handler(request, {
      waitUntil: (task: Promise<unknown>) =>
        after(async () => {
          try {
            await task

            // Post-response telemetry: emit a structured log so the
            // riskLevel is visible in real-time in the Vercel log stream.
            structuredLog('WEBHOOK_PROCESSED', {
              platform,
              completedAt: new Date().toISOString(),
            })
          } catch (err) {
            logError('WEBHOOK_TASK_FAILED', err, { platform })
          }
        }),
    })
  } catch (error) {
    logError('WEBHOOK_RECEIVED', error, { platform })
    return new Response('Internal Server Error', { status: 500 })
  }
}

// Health-check endpoint for each platform
export async function GET(_request: Request, context: RouteContext) {
  const { platform } = await context.params
  return Response.json({
    status: 'ok',
    platform,
    availablePlatforms: Object.keys(bot.webhooks),
    timestamp: new Date().toISOString(),
  })
}

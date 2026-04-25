import { isPlatformConfigured } from '@/src/config/env'
import { getSocMetrics } from '@/src/core/sessionStore'

export async function GET() {
  const metrics = await getSocMetrics().catch(() => ({
    threatsBlocked: 0,
    activeSessions: 0,
  }))

  const health = {
    status: 'healthy',
    service: 'cybersecurity-agent',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    platforms: {
      discord: {
        configured: isPlatformConfigured('discord'),
        status: isPlatformConfigured('discord') ? 'active' : 'not_configured',
      },
      slack: {
        configured: isPlatformConfigured('slack'),
        status: isPlatformConfigured('slack') ? 'active' : 'not_configured',
      },
    },
    metrics: {
      threatsBlocked: metrics.threatsBlocked,
      activeSessions: metrics.activeSessions,
    },
    endpoints: {
      discordWebhook: '/api/webhooks/discord',
      slackWebhook:   '/api/webhooks/slack',
      health:         '/api/health',
    },
  }

  return Response.json(health)
}

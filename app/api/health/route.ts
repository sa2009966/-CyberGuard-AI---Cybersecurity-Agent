import { isPlatformConfigured } from '@/src/config/env'
import { sessionStore } from '@/src/core/sessionStore'

export async function GET() {
  const sessions = await sessionStore.getAll()

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
    sessions: {
      active: sessions.length,
      flaggedForReview: sessions.filter((s) => s.riskProfile.flaggedForReview).length,
    },
    endpoints: {
      discordWebhook: '/api/webhooks/discord',
      slackWebhook: '/api/webhooks/slack',
      health: '/api/health',
    },
  }

  return Response.json(health)
}

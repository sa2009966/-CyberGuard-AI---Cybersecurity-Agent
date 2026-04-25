import { createSlackAdapter, type SlackAdapterConfig } from '@chat-adapter/slack'
import { getEnv, isPlatformConfigured } from '../../config/env'
import { structuredLog } from '../../core/logger'

/**
 * Creates and configures the Slack adapter
 * Platform-agnostic - all business logic is in the core modules
 */
export function createSlackPlatformAdapter() {
  if (!isPlatformConfigured('slack')) {
    structuredLog('PLATFORM_ERROR', {
      platform: 'slack',
      error: 'Slack is not fully configured',
      missingVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'].filter(
        (v) => !process.env[v]
      ),
    }, 'WARN')
    return null
  }

  try {
    const env = getEnv()
    if (!env) return null

    const config: SlackAdapterConfig = {
      botToken: env.SLACK_BOT_TOKEN,
      signingSecret: env.SLACK_SIGNING_SECRET,
    }

    const adapter = createSlackAdapter(config)

    structuredLog('PLATFORM_CONNECTED', {
      platform: 'slack',
      tokenPrefix: env.SLACK_BOT_TOKEN.substring(0, 10) + '...',
    })

    return adapter
  } catch (error) {
    structuredLog('PLATFORM_ERROR', {
      platform: 'slack',
      error: error instanceof Error ? error.message : String(error),
    }, 'ERROR')
    return null
  }
}

/**
 * Slack-specific message formatting utilities
 */
export const slackFormatter = {
  /**
   * Format security alert for Slack using Block Kit style
   */
  formatAlert(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    title: string,
    description: string
  ): string {
    const emojis = {
      LOW: ':large_green_circle:',
      MEDIUM: ':large_yellow_circle:',
      HIGH: ':red_circle:',
    }

    return `${emojis[riskLevel]} *${title}*\n${description}`
  },

  /**
   * Format code block for Slack
   */
  codeBlock(content: string): string {
    return `\`\`\`${content}\`\`\``
  },

  /**
   * Format inline code
   */
  inlineCode(content: string): string {
    return `\`${content}\``
  },

  /**
   * Format a security report for Slack
   */
  formatSecurityReport(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    score: number,
    threats: string[],
    recommendations: string[]
  ): string {
    const emoji = {
      LOW: ':large_green_circle:',
      MEDIUM: ':large_yellow_circle:',
      HIGH: ':red_circle:',
    }

    let report = `${emoji[riskLevel]} *Security Analysis Report*\n`
    report += `───────────────────────────\n`
    report += `*Risk Level:* ${riskLevel}\n`
    report += `*Risk Score:* ${score}/100\n\n`

    if (threats.length > 0) {
      report += `*:dart: Detected Threats:*\n`
      threats.forEach((t) => (report += `• ${t}\n`))
      report += '\n'
    }

    if (recommendations.length > 0) {
      report += `*:bulb: Recommendations:*\n`
      recommendations.forEach((r) => (report += `• ${r}\n`))
    }

    return report
  },

  /**
   * Create a divider
   */
  divider(): string {
    return '───────────────────────────'
  },
}

/**
 * Slack rate limit configuration
 */
export const slackRateLimits = {
  messagesPerSecond: 1,
  messagesPerMinute: 30,
  charactersPerMessage: 4000,
}

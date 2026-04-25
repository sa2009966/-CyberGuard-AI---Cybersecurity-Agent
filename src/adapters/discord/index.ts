import { createDiscordAdapter, type DiscordAdapterConfig } from '@chat-adapter/discord'
import { getEnv, isPlatformConfigured } from '../../config/env'
import { structuredLog } from '../../core/logger'

/**
 * Creates and configures the Discord adapter
 * Platform-agnostic - all business logic is in the core modules
 */
export function createDiscordPlatformAdapter() {
  if (!isPlatformConfigured('discord')) {
    structuredLog('PLATFORM_ERROR', {
      platform: 'discord',
      error: 'Discord is not fully configured',
      missingVars: ['DISCORD_TOKEN', 'DISCORD_PUBLIC_KEY', 'DISCORD_APPLICATION_ID'].filter(
        (v) => !process.env[v]
      ),
    }, 'WARN')
    return null
  }

  try {
    const env = getEnv()
    if (!env) return null

    const config: DiscordAdapterConfig = {
      token: env.DISCORD_TOKEN,
      publicKey: env.DISCORD_PUBLIC_KEY,
      applicationId: env.DISCORD_APPLICATION_ID,
    }

    const adapter = createDiscordAdapter(config)

    structuredLog('PLATFORM_CONNECTED', {
      platform: 'discord',
      applicationId: env.DISCORD_APPLICATION_ID.substring(0, 8) + '...',
    })

    return adapter
  } catch (error) {
    structuredLog('PLATFORM_ERROR', {
      platform: 'discord',
      error: error instanceof Error ? error.message : String(error),
    }, 'ERROR')
    return null
  }
}

/**
 * Discord-specific message formatting utilities
 */
export const discordFormatter = {
  /**
   * Format security alert for Discord
   */
  formatAlert(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    title: string,
    description: string
  ): string {
    const colors = {
      LOW: '🟢',
      MEDIUM: '🟡',
      HIGH: '🔴',
    }

    return `${colors[riskLevel]} **${title}**\n${description}`
  },

  /**
   * Format code block for Discord
   */
  codeBlock(content: string, language = ''): string {
    return `\`\`\`${language}\n${content}\n\`\`\``
  },

  /**
   * Format inline code
   */
  inlineCode(content: string): string {
    return `\`${content}\``
  },

  /**
   * Format a security report embed-style
   */
  formatSecurityReport(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    score: number,
    threats: string[],
    recommendations: string[]
  ): string {
    const emoji = { LOW: '🟢', MEDIUM: '🟡', HIGH: '🔴' }

    let report = `${emoji[riskLevel]} **Security Analysis Report**\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `**Risk Level:** ${riskLevel}\n`
    report += `**Risk Score:** ${score}/100\n\n`

    if (threats.length > 0) {
      report += `**🎯 Detected Threats:**\n`
      threats.forEach((t) => (report += `> • ${t}\n`))
      report += '\n'
    }

    if (recommendations.length > 0) {
      report += `**💡 Recommendations:**\n`
      recommendations.forEach((r) => (report += `> ${r}\n`))
    }

    return report
  },
}

/**
 * Discord rate limit configuration
 */
export const discordRateLimits = {
  messagesPerSecond: 5,
  messagesPerMinute: 30,
  charactersPerMessage: 2000,
}

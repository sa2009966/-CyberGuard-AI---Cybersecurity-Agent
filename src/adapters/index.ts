/**
 * Platform Adapters - ChatSDK Integration
 *
 * This module provides a unified interface for all supported platforms.
 * All adapters are platform-agnostic - business logic lives in core modules.
 */

export { createDiscordPlatformAdapter, discordFormatter, discordRateLimits } from './discord'
export { createSlackPlatformAdapter, slackFormatter, slackRateLimits } from './slack'

/**
 * Platform-agnostic message formatter
 */
export interface UniversalFormatter {
  formatAlert(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH', title: string, description: string): string
  codeBlock(content: string, language?: string): string
  inlineCode(content: string): string
  formatSecurityReport(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    score: number,
    threats: string[],
    recommendations: string[]
  ): string
}

/**
 * Get the appropriate formatter for a platform
 */
export function getFormatter(platform: 'discord' | 'slack'): UniversalFormatter {
  const { discordFormatter } = require('./discord')
  const { slackFormatter } = require('./slack')

  const formatters: Record<string, UniversalFormatter> = {
    discord: discordFormatter,
    slack: slackFormatter,
  }

  return formatters[platform] || formatters.discord
}

/**
 * Platform Adapters - ChatSDK Integration
 *
 * This module provides a unified interface for all supported platforms.
 * All adapters are platform-agnostic - business logic lives in core modules.
 */

export { createDiscordPlatformAdapter, discordFormatter, discordRateLimits } from './discord'
export { createSlackPlatformAdapter, slackFormatter, slackRateLimits } from './slack'

import { discordFormatter } from './discord'
import { slackFormatter } from './slack'

/**
 * Platform-agnostic message formatter interface.
 * Both discordFormatter and slackFormatter satisfy this contract.
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
 * Returns the appropriate formatter for a given platform.
 * Uses static ES imports — no require() to stay ESM-compatible.
 */
export function getFormatter(platform: 'discord' | 'slack'): UniversalFormatter {
  const formatters: Record<string, UniversalFormatter> = {
    discord: discordFormatter,
    slack: slackFormatter,
  }
  return formatters[platform] ?? discordFormatter
}

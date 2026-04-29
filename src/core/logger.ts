/**
 * Structured Logging System for Cybersecurity Agent
 *
 * Outputs JSON logs that are easy to parse in Vercel logs
 * Shows real-time risk analysis for judges to monitor
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SECURITY'

export type LogEvent =
  | 'SECURITY_ANALYSIS'
  | 'SESSION_ACCESS'
  | 'SESSION_CLEANUP'
  | 'USER_FLAGGED'
  | 'MESSAGE_RECEIVED'
  | 'MESSAGE_PROCESSED'
  | 'BOT_STARTED'
  | 'BOT_ERROR'
  | 'PLATFORM_CONNECTED'
  | 'PLATFORM_ERROR'
  | 'ENV_VALIDATED'
  | 'WEBHOOK_RECEIVED'
  | 'WEBHOOK_PROCESSED'
  | 'WEBHOOK_TASK_FAILED'
  | 'RESPONSE_SENT'
  | 'ADAPTER_INIT_DISCORD'
  | 'ADAPTER_INIT_SLACK'

interface LogEntry {
  timestamp: string
  level: LogLevel
  event: LogEvent
  service: string
  data: Record<string, unknown>
}

/**
 * Main structured logging function
 * Outputs JSON for easy parsing in Vercel logs
 */
export function structuredLog(
  event: LogEvent,
  data: Record<string, unknown>,
  level: LogLevel = 'INFO'
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'cybersecurity-agent',
    data,
  }

  // Color-coded console output for development
  const colors = {
    DEBUG: '\x1b[36m', // Cyan
    INFO: '\x1b[32m', // Green
    WARN: '\x1b[33m', // Yellow
    ERROR: '\x1b[31m', // Red
    SECURITY: '\x1b[35m', // Magenta
  }
  const reset = '\x1b[0m'

  // Format for visual appeal in logs
  const riskIndicator = getRiskIndicator(data)

  console.log(
    `${colors[level]}[${entry.timestamp}]${reset} ` +
      `[${entry.level}] ` +
      `[${entry.event}] ` +
      `${riskIndicator}` +
      `${JSON.stringify(entry.data)}`
  )
}

/**
 * Gets visual risk indicator for log output
 */
function getRiskIndicator(data: Record<string, unknown>): string {
  if ('riskLevel' in data) {
    const riskLevel = data.riskLevel as string
    const indicators = {
      HIGH: '🔴 HIGH RISK 🔴 ',
      MEDIUM: '🟡 MEDIUM RISK 🟡 ',
      LOW: '🟢 LOW RISK 🟢 ',
    }
    return indicators[riskLevel as keyof typeof indicators] || ''
  }
  return ''
}

/**
 * Log a security analysis event with full details
 */
export function logSecurityAnalysis(
  userId: string,
  platform: string,
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
  score: number,
  details: Record<string, unknown> = {}
): void {
  structuredLog(
    'SECURITY_ANALYSIS',
    {
      userId,
      platform,
      riskLevel,
      score,
      ...details,
    },
    'SECURITY'
  )
}

/**
 * Log incoming message
 */
export function logMessageReceived(
  userId: string,
  platform: string,
  messageLength: number,
  threadId?: string
): void {
  structuredLog('MESSAGE_RECEIVED', {
    userId,
    platform,
    messageLength,
    threadId: threadId || 'N/A',
  })
}

/**
 * Log message processing complete
 */
export function logMessageProcessed(
  userId: string,
  platform: string,
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
  processingTimeMs: number
): void {
  structuredLog('MESSAGE_PROCESSED', {
    userId,
    platform,
    riskLevel,
    processingTimeMs,
  })
}

/**
 * Log bot startup
 */
export function logBotStarted(platforms: string[]): void {
  structuredLog('BOT_STARTED', {
    platforms,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
}

/**
 * Log errors with stack trace
 */
export function logError(
  event: LogEvent,
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  const errorDetails = error instanceof Error
    ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    : { message: String(error) }

  structuredLog(
    event,
    {
      error: errorDetails,
      ...context,
    },
    'ERROR'
  )
}

/**
 * Create a request logger for webhooks
 */
export function logWebhook(
  platform: string,
  method: string,
  path: string,
  status?: number
): void {
  structuredLog('WEBHOOK_RECEIVED', {
    platform,
    method,
    path,
    status: status || 'pending',
  })
}

/**
 * Performance timing utility
 */
export function createTimer(): { elapsed: () => number } {
  const start = Date.now()
  return {
    elapsed: () => Date.now() - start,
  }
}

/** @jsxImportSource chat */
import { Chat, Card, CardText, Actions, Button, Divider } from 'chat'
import { createMemoryState } from '@chat-adapter/state-memory'
import { createRedisState } from '@chat-adapter/state-redis'
import { streamText } from 'ai'

import { getEnv } from '../src/config/env'
import { createDiscordPlatformAdapter } from '../src/adapters/discord'
import { createSlackPlatformAdapter } from '../src/adapters/slack'
import {
  analyzeMessage,
  formatAnalysisReport,
  type SecurityAnalysis,
} from '../src/core/securityAnalyzer'
import {
  updateSessionWithAnalysis,
  getUserRiskSummary,
} from '../src/core/sessionStore'
import {
  structuredLog,
  logMessageReceived,
  logMessageProcessed,
  logBotStarted,
  logError,
  createTimer,
} from '../src/core/logger'

// System prompt for the AI cybersecurity assistant
const SYSTEM_PROMPT = `You are CyberGuard AI, an advanced cybersecurity assistant that helps users understand and respond to potential security threats.

Your capabilities:
1. **Threat Analysis**: Analyze messages for phishing, malware, social engineering, and other threats
2. **Security Advice**: Provide actionable recommendations to improve security posture
3. **Incident Response**: Guide users through proper incident response procedures
4. **Education**: Explain security concepts in accessible terms

When responding:
- Always acknowledge the security analysis that was performed on the user's message
- If threats were detected, explain what they are and why they're dangerous
- Provide clear, actionable next steps
- Be professional but approachable
- Never execute or enable malicious actions
- If asked to do something potentially harmful, explain why you can't and offer safe alternatives

Current context will include the security analysis results. Use this to inform your responses.`

// Initialize adapters
const adapters: Record<string, ReturnType<typeof createDiscordPlatformAdapter>> = {}

const discordAdapter = createDiscordPlatformAdapter()
if (discordAdapter) {
  adapters.discord = discordAdapter
}

const slackAdapter = createSlackPlatformAdapter()
if (slackAdapter) {
  adapters.slack = slackAdapter
}

// Determine state adapter
function getStateAdapter() {
  try {
    const env = getEnv()
    if (env.REDIS_URL) {
      structuredLog('BOT_STARTED', { state: 'redis', url: 'configured' })
      return createRedisState({ url: env.REDIS_URL })
    }
  } catch {
    // Fall through to memory state
  }

  structuredLog('BOT_STARTED', { state: 'memory', warning: 'Using in-memory state - data will not persist across restarts' })
  return createMemoryState()
}

// Create the bot instance
export const bot = new Chat({
  userName: 'CyberGuard',
  adapters,
  state: getStateAdapter(),
})

// Log startup
const platforms = Object.keys(adapters)
if (platforms.length > 0) {
  logBotStarted(platforms)
} else {
  structuredLog('BOT_ERROR', {
    error: 'No platforms configured',
    suggestion: 'Set DISCORD_* or SLACK_* environment variables',
  }, 'WARN')
}

/**
 * Process a message and generate AI response with security context
 */
async function processSecurityMessage(
  message: string,
  analysis: SecurityAnalysis,
  userId: string
): Promise<ReturnType<typeof streamText>> {
  const analysisContext = `
SECURITY ANALYSIS RESULTS:
- Risk Level: ${analysis.riskLevel}
- Risk Score: ${analysis.score}/100
- Detected Threats: ${analysis.threats.length > 0 ? analysis.threats.join(', ') : 'None'}
- Indicators Found: ${analysis.indicators.length}
- Recommendations: ${analysis.recommendations.join('; ')}

USER MESSAGE TO ANALYZE:
${message}
`

  return streamText({
    model: 'openai/gpt-4o-mini',
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: analysisContext,
      },
    ],
  })
}

// Handle new mentions
bot.onNewMention(async (thread, message) => {
  const timer = createTimer()
  const userId = message.author.id
  const platform = thread.adapter.name

  // Log incoming message
  logMessageReceived(userId, platform, message.text.length, thread.id)

  try {
    // Subscribe to the thread for future messages
    await thread.subscribe()

    // Perform security analysis
    const analysis = analyzeMessage(message.text, userId, platform)

    // Update user session
    await updateSessionWithAnalysis(userId, platform, analysis)

    // Show typing indicator
    await thread.startTyping()

    // Send initial security report card
    await thread.post(
      <Card title="🛡️ CyberGuard Security Analysis">
        <CardText>
          {analysis.riskLevel === 'HIGH'
            ? '🔴 **HIGH RISK DETECTED** - Immediate attention required!'
            : analysis.riskLevel === 'MEDIUM'
              ? '🟡 **MEDIUM RISK** - Exercise caution'
              : '🟢 **LOW RISK** - No immediate threats detected'}
        </CardText>
        <CardText>
          **Risk Score:** {analysis.score}/100 | **Threats:** {analysis.threats.length} |{' '}
          **Indicators:** {analysis.indicators.length}
        </CardText>
        <Divider />
        <Actions>
          <Button id="detailed-report" style="primary">
            📋 Full Report
          </Button>
          <Button id="user-history">📊 My History</Button>
        </Actions>
      </Card>
    )

    // Stream AI response
    const result = await processSecurityMessage(message.text, analysis, userId)
    await thread.post(result.textStream)

    // Log completion
    logMessageProcessed(userId, platform, analysis.riskLevel, timer.elapsed())
  } catch (error) {
    logError('BOT_ERROR', error, { userId, platform, threadId: thread.id })

    await thread.post(
      '❌ An error occurred while processing your message. Please try again.'
    )
  }
})

// Handle messages in subscribed threads
bot.onSubscribedMessage(async (thread, message) => {
  // Skip bot's own messages
  if (message.author.isMe) return

  const timer = createTimer()
  const userId = message.author.id
  const platform = thread.adapter.name

  logMessageReceived(userId, platform, message.text.length, thread.id)

  try {
    // Perform security analysis
    const analysis = analyzeMessage(message.text, userId, platform)

    // Update session
    await updateSessionWithAnalysis(userId, platform, analysis)

    // Build conversation history
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = []
    for await (const msg of thread.allMessages) {
      if (msg.text) {
        history.push({
          role: msg.author.isMe ? 'assistant' : 'user',
          content: msg.text,
        })
      }
    }

    // Only show security card for elevated risks
    if (analysis.riskLevel !== 'LOW') {
      await thread.post(
        `${analysis.riskLevel === 'HIGH' ? '🔴' : '🟡'} **Security Alert**: ${analysis.riskLevel} risk detected (Score: ${analysis.score}/100)`
      )
    }

    // Stream AI response with security context
    const result = await processSecurityMessage(message.text, analysis, userId)
    await thread.post(result.textStream)

    logMessageProcessed(userId, platform, analysis.riskLevel, timer.elapsed())
  } catch (error) {
    logError('BOT_ERROR', error, { userId, platform, threadId: thread.id })
  }
})

// Handle detailed report button
bot.onAction('detailed-report', async (event) => {
  const userId = event.user.id
  const platform = event.thread.adapter.name

  // Get the last analysis from session
  const { sessionStore } = await import('../src/core/sessionStore')
  const session = await sessionStore.get(userId, platform)

  if (session && session.analysisHistory.length > 0) {
    const lastAnalysis = session.analysisHistory[session.analysisHistory.length - 1]

    await event.thread.post(`
📋 **Detailed Security Report**
━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Analysis Timestamp:** ${lastAnalysis.timestamp}
**Risk Level:** ${lastAnalysis.riskLevel}
**Risk Score:** ${lastAnalysis.score}/100
**Threats Detected:** ${lastAnalysis.threatCount}

**Your Risk Profile:**
• Average Risk Score: ${session.riskProfile.averageRiskScore}/100
• High Risk Messages: ${session.riskProfile.highRiskCount}
• Medium Risk Messages: ${session.riskProfile.mediumRiskCount}
• Low Risk Messages: ${session.riskProfile.lowRiskCount}

${session.riskProfile.flaggedForReview ? '🚩 **Note:** Your account has been flagged for security review due to multiple high-risk messages.' : ''}
    `)
  } else {
    await event.thread.post('No analysis history found. Send a message to get started!')
  }
})

// Handle user history button
bot.onAction('user-history', async (event) => {
  const userId = event.user.id
  const platform = event.thread.adapter.name

  const summary = await getUserRiskSummary(userId, platform)
  await event.thread.post(summary)
})

// Handle help command
bot.onNewMessage(/^!help|^\/help/i, async (thread, message) => {
  await thread.post(`
🛡️ **CyberGuard AI - Help**
━━━━━━━━━━━━━━━━━━━━━━━━━━━

**What I Do:**
I analyze messages for security threats and provide guidance on cybersecurity best practices.

**Commands:**
• \`!help\` - Show this help message
• \`!analyze <message>\` - Analyze a specific message for threats
• \`!summary\` - View your security summary

**How to Use:**
Simply @mention me in any channel, and I'll analyze your message for potential security threats like:
- 🎣 Phishing attempts
- 🦠 Malware indicators
- 🔐 Credential harvesting
- 💉 Injection attacks
- 📊 Data exfiltration attempts

**Need Help?**
Feel free to ask me any cybersecurity questions!
  `)
})

// Handle analyze command
bot.onNewMessage(/^!analyze\s+(.+)/i, async (thread, message) => {
  const match = message.text.match(/^!analyze\s+(.+)/i)
  if (!match) return

  const textToAnalyze = match[1]
  const userId = message.author.id
  const platform = thread.adapter.name

  const analysis = analyzeMessage(textToAnalyze, userId, platform)
  const report = formatAnalysisReport(analysis)

  await thread.post(report)
})

// Handle summary command
bot.onNewMessage(/^!summary/i, async (thread, message) => {
  const userId = message.author.id
  const platform = thread.adapter.name

  const summary = await getUserRiskSummary(userId, platform)
  await thread.post(summary)
})

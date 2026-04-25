import { structuredLog } from './logger'
import type { SecurityAnalysis } from './securityAnalyzer'

/**
 * User Session Data
 */
export interface UserSession {
  userId: string
  platform: string
  createdAt: string
  lastActiveAt: string
  messageCount: number
  analysisHistory: AnalysisHistoryEntry[]
  riskProfile: RiskProfile
  preferences: UserPreferences
}

/**
 * Analysis History Entry
 */
export interface AnalysisHistoryEntry {
  timestamp: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  score: number
  threatCount: number
}

/**
 * User Risk Profile - tracks patterns over time
 */
export interface RiskProfile {
  averageRiskScore: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  lastHighRiskTimestamp: string | null
  flaggedForReview: boolean
}

/**
 * User Preferences
 */
export interface UserPreferences {
  alertLevel: 'all' | 'medium-high' | 'high-only'
  language: string
  verboseReports: boolean
}

/**
 * Session Store Interface - for future KV/Redis implementation
 */
export interface SessionStore {
  get(userId: string, platform: string): Promise<UserSession | null>
  set(session: UserSession): Promise<void>
  delete(userId: string, platform: string): Promise<boolean>
  getAll(): Promise<UserSession[]>
  cleanup(maxAgeMs: number): Promise<number>
}

/**
 * In-Memory Session Store
 * Ready for migration to Vercel KV or Upstash Redis
 */
class InMemorySessionStore implements SessionStore {
  private sessions: Map<string, UserSession> = new Map()

  private getKey(userId: string, platform: string): string {
    return `${platform}:${userId}`
  }

  async get(userId: string, platform: string): Promise<UserSession | null> {
    const key = this.getKey(userId, platform)
    const session = this.sessions.get(key)

    if (session) {
      structuredLog('SESSION_ACCESS', {
        userId,
        platform,
        action: 'GET',
        found: true,
        messageCount: session.messageCount,
      })
    }

    return session || null
  }

  async set(session: UserSession): Promise<void> {
    const key = this.getKey(session.userId, session.platform)
    this.sessions.set(key, session)

    structuredLog('SESSION_ACCESS', {
      userId: session.userId,
      platform: session.platform,
      action: 'SET',
      messageCount: session.messageCount,
      riskProfile: session.riskProfile,
    })
  }

  async delete(userId: string, platform: string): Promise<boolean> {
    const key = this.getKey(userId, platform)
    const existed = this.sessions.has(key)
    this.sessions.delete(key)

    structuredLog('SESSION_ACCESS', {
      userId,
      platform,
      action: 'DELETE',
      existed,
    })

    return existed
  }

  async getAll(): Promise<UserSession[]> {
    return Array.from(this.sessions.values())
  }

  async cleanup(maxAgeMs: number): Promise<number> {
    const now = Date.now()
    let cleaned = 0

    for (const [key, session] of this.sessions.entries()) {
      const lastActive = new Date(session.lastActiveAt).getTime()
      if (now - lastActive > maxAgeMs) {
        this.sessions.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      structuredLog('SESSION_CLEANUP', {
        cleanedCount: cleaned,
        remainingCount: this.sessions.size,
        maxAgeMs,
      })
    }

    return cleaned
  }
}

/**
 * Global session store instance
 */
export const sessionStore = new InMemorySessionStore()

/**
 * Creates a new user session
 */
export function createSession(userId: string, platform: string): UserSession {
  const now = new Date().toISOString()

  return {
    userId,
    platform,
    createdAt: now,
    lastActiveAt: now,
    messageCount: 0,
    analysisHistory: [],
    riskProfile: {
      averageRiskScore: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      lastHighRiskTimestamp: null,
      flaggedForReview: false,
    },
    preferences: {
      alertLevel: 'all',
      language: 'en',
      verboseReports: true,
    },
  }
}

/**
 * Updates session with new analysis
 */
export async function updateSessionWithAnalysis(
  userId: string,
  platform: string,
  analysis: SecurityAnalysis
): Promise<UserSession> {
  let session = await sessionStore.get(userId, platform)

  if (!session) {
    session = createSession(userId, platform)
  }

  // Update activity
  session.lastActiveAt = new Date().toISOString()
  session.messageCount++

  // Add to history (keep last 50)
  session.analysisHistory.push({
    timestamp: analysis.timestamp,
    riskLevel: analysis.riskLevel,
    score: analysis.score,
    threatCount: analysis.threats.length,
  })

  if (session.analysisHistory.length > 50) {
    session.analysisHistory = session.analysisHistory.slice(-50)
  }

  // Update risk profile
  const profile = session.riskProfile

  switch (analysis.riskLevel) {
    case 'HIGH':
      profile.highRiskCount++
      profile.lastHighRiskTimestamp = analysis.timestamp
      break
    case 'MEDIUM':
      profile.mediumRiskCount++
      break
    case 'LOW':
      profile.lowRiskCount++
      break
  }

  // Calculate average risk score from recent history
  const recentAnalyses = session.analysisHistory.slice(-10)
  profile.averageRiskScore = Math.round(
    recentAnalyses.reduce((sum, a) => sum + a.score, 0) / recentAnalyses.length
  )

  // Flag for review if multiple high-risk messages
  if (profile.highRiskCount >= 3 || profile.averageRiskScore >= 60) {
    profile.flaggedForReview = true

    structuredLog('USER_FLAGGED', {
      userId,
      platform,
      reason: profile.highRiskCount >= 3 ? 'HIGH_RISK_COUNT' : 'HIGH_AVG_SCORE',
      highRiskCount: profile.highRiskCount,
      averageRiskScore: profile.averageRiskScore,
    })
  }

  await sessionStore.set(session)
  return session
}

/**
 * Gets user risk summary
 */
export async function getUserRiskSummary(
  userId: string,
  platform: string
): Promise<string> {
  const session = await sessionStore.get(userId, platform)

  if (!session) {
    return 'No session history found for this user.'
  }

  const profile = session.riskProfile
  const flagStatus = profile.flaggedForReview ? '🚩 FLAGGED FOR REVIEW' : '✅ Normal'

  return `
**User Risk Summary**
━━━━━━━━━━━━━━━━━━━━━━━━
**User ID:** ${session.userId}
**Platform:** ${session.platform}
**Status:** ${flagStatus}
**Total Messages Analyzed:** ${session.messageCount}
**Average Risk Score:** ${profile.averageRiskScore}/100

**Risk Distribution:**
  🔴 High: ${profile.highRiskCount}
  🟡 Medium: ${profile.mediumRiskCount}
  🟢 Low: ${profile.lowRiskCount}

**Last Active:** ${session.lastActiveAt}
${profile.lastHighRiskTimestamp ? `**Last High-Risk Event:** ${profile.lastHighRiskTimestamp}` : ''}
  `.trim()
}

/**
 * Export for Redis migration
 * When migrating to Redis/KV, implement this interface with your Redis client
 */
export function createRedisSessionStore(redisUrl: string): SessionStore {
  // Placeholder for Redis implementation
  // When using @chat-adapter/state-redis, the Chat SDK handles state
  // This is for custom session data beyond Chat SDK's built-in state

  console.log(`[SessionStore] Redis URL configured: ${redisUrl ? 'Yes' : 'No'}`)

  // For now, return in-memory store
  // Replace with actual Redis implementation when needed
  return new InMemorySessionStore()
}

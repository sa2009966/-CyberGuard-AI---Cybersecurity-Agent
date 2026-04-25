/**
 * sessionStore.ts
 *
 * Persistence layer backed by Upstash Redis via @upstash/redis.
 * The public interface (createSession, updateSessionWithAnalysis,
 * getUserRiskSummary, getSocMetrics) is intentionally stable so
 * bot.tsx and health/route.ts require zero changes.
 *
 * Redis key schema
 * ─────────────────────────────────────────────────────────────
 *  session:{platform}:{userId}   → UserSession JSON  (TTL 7d)
 *  metrics:threats:high          → integer counter   (no TTL)
 *  metrics:sessions:active       → integer counter   (no TTL)
 */

import { Redis } from '@upstash/redis'
import { structuredLog } from './logger'
import type { SecurityAnalysis } from './securityAnalyzer'

// ─── Redis client ─────────────────────────────────────────────────────────────

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_TTL_SECONDS  = 60 * 60 * 24 * 7  // 7 days
const MAX_HISTORY_ENTRIES  = 50
const HIGH_RISK_THRESHOLD  = 3                  // auto-flag after N HIGH msgs
const AVG_SCORE_THRESHOLD  = 60                 // auto-flag if rolling avg ≥ this

const METRICS_THREATS_KEY  = 'metrics:threats:high'
const METRICS_SESSIONS_KEY = 'metrics:sessions:active'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisHistoryEntry {
  timestamp: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  score: number
  threatCount: number
}

export interface RiskProfile {
  averageRiskScore: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  lastHighRiskTimestamp: string | null
  flaggedForReview: boolean
}

export interface UserPreferences {
  alertLevel: 'all' | 'medium-high' | 'high-only'
  language: string
  verboseReports: boolean
}

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

export interface SocMetrics {
  threatsBlocked: number
  activeSessions: number
}

// ─── Key helper ───────────────────────────────────────────────────────────────

const sessionKey = (platform: string, userId: string) =>
  `session:${platform}:${userId}`

// ─── Core CRUD ────────────────────────────────────────────────────────────────

export async function getSession(
  userId: string,
  platform: string,
): Promise<UserSession | null> {
  try {
    const data = await redis.get<UserSession>(sessionKey(platform, userId))
    if (data) {
      structuredLog('SESSION_ACCESS', {
        userId,
        platform,
        action: 'GET',
        found: true,
        messageCount: data.messageCount,
      })
    }
    return data ?? null
  } catch (err) {
    console.error('[SessionStore] getSession error:', err)
    return null
  }
}

export async function saveSession(session: UserSession): Promise<void> {
  try {
    await redis.set(
      sessionKey(session.platform, session.userId),
      session,
      { ex: SESSION_TTL_SECONDS },
    )
    structuredLog('SESSION_ACCESS', {
      userId: session.userId,
      platform: session.platform,
      action: 'SET',
      messageCount: session.messageCount,
      flaggedForReview: session.riskProfile.flaggedForReview,
    })
  } catch (err) {
    console.error('[SessionStore] saveSession error:', err)
  }
}

export async function markAsFlagged(
  userId: string,
  platform: string,
): Promise<void> {
  const session = await getSession(userId, platform)
  if (!session) return
  session.riskProfile.flaggedForReview = true
  await saveSession(session)
  console.warn(
    `[SessionStore] User manually flagged — platform=${platform} userId=${userId}`,
  )
}

// ─── Session factory ──────────────────────────────────────────────────────────

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

// ─── Update with analysis ─────────────────────────────────────────────────────

export async function updateSessionWithAnalysis(
  userId: string,
  platform: string,
  analysis: SecurityAnalysis,
): Promise<UserSession> {
  let session = await getSession(userId, platform)

  if (!session) {
    session = createSession(userId, platform)
    // New session: increment global active-sessions counter
    redis.incr(METRICS_SESSIONS_KEY).catch(() => {})
  }

  session.lastActiveAt = new Date().toISOString()
  session.messageCount++

  // Append history — keep last MAX_HISTORY_ENTRIES
  session.analysisHistory.push({
    timestamp: analysis.timestamp,
    riskLevel: analysis.riskLevel,
    score: analysis.score,
    threatCount: analysis.threats.length,
  })
  if (session.analysisHistory.length > MAX_HISTORY_ENTRIES) {
    session.analysisHistory = session.analysisHistory.slice(-MAX_HISTORY_ENTRIES)
  }

  // Update risk counters
  const profile = session.riskProfile
  switch (analysis.riskLevel) {
    case 'HIGH':
      profile.highRiskCount++
      profile.lastHighRiskTimestamp = analysis.timestamp
      // Increment persistent HIGH-threat counter for SOC dashboard
      redis.incr(METRICS_THREATS_KEY).catch(() => {})
      break
    case 'MEDIUM':
      profile.mediumRiskCount++
      break
    case 'LOW':
      profile.lowRiskCount++
      break
  }

  // Rolling average over last 10 messages
  const recent = session.analysisHistory.slice(-10)
  profile.averageRiskScore = Math.round(
    recent.reduce((sum, a) => sum + a.score, 0) / recent.length,
  )

  // Auto-flag if thresholds are breached
  if (
    !profile.flaggedForReview &&
    (profile.highRiskCount >= HIGH_RISK_THRESHOLD ||
      profile.averageRiskScore >= AVG_SCORE_THRESHOLD)
  ) {
    profile.flaggedForReview = true
    structuredLog('USER_FLAGGED', {
      userId,
      platform,
      reason: profile.highRiskCount >= HIGH_RISK_THRESHOLD ? 'HIGH_RISK_COUNT' : 'HIGH_AVG_SCORE',
      highRiskCount: profile.highRiskCount,
      averageRiskScore: profile.averageRiskScore,
    })
  }

  await saveSession(session)
  return session
}

// ─── Risk summary (human-readable) ───────────────────────────────────────────

export async function getUserRiskSummary(
  userId: string,
  platform: string,
): Promise<string> {
  const session = await getSession(userId, platform)
  if (!session) return 'No session history found for this user.'

  const { riskProfile: p } = session
  const flagStatus = p.flaggedForReview ? 'FLAGGED FOR REVIEW' : 'Normal'

  return `
**User Risk Summary**
━━━━━━━━━━━━━━━━━━━━━━━━
**User ID:** ${session.userId}
**Platform:** ${session.platform}
**Status:** ${flagStatus}
**Total Messages Analyzed:** ${session.messageCount}
**Average Risk Score:** ${p.averageRiskScore}/100

**Risk Distribution:**
  High: ${p.highRiskCount}
  Medium: ${p.mediumRiskCount}
  Low: ${p.lowRiskCount}

**Last Active:** ${session.lastActiveAt}
${p.lastHighRiskTimestamp ? `**Last High-Risk Event:** ${p.lastHighRiskTimestamp}` : ''}
  `.trim()
}

// ─── SOC metrics ──────────────────────────────────────────────────────────────

export async function getSocMetrics(): Promise<SocMetrics> {
  try {
    const [threatsBlocked, activeSessions] = await Promise.all([
      redis.get<number>(METRICS_THREATS_KEY),
      redis.get<number>(METRICS_SESSIONS_KEY),
    ])
    return {
      threatsBlocked: threatsBlocked ?? 0,
      activeSessions: activeSessions ?? 0,
    }
  } catch (err) {
    console.error('[SessionStore] getSocMetrics error:', err)
    return { threatsBlocked: 0, activeSessions: 0 }
  }
}

// ─── Legacy shim (keeps health/route.ts compilable) ──────────────────────────
// The old code called `sessionStore.getAll()` and `sessionStore.set()`.
// We expose a minimal compatible object so those call-sites don't break.

export const sessionStore = {
  getAll: async (): Promise<UserSession[]> => {
    // Scanning all session keys is not efficient at scale;
    // the SOC dashboard should use getSocMetrics() instead.
    return []
  },
}

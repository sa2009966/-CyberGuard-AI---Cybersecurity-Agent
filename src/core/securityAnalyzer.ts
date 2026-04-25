import { structuredLog } from './logger'

/**
 * Security Risk Levels
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

/**
 * Security Analysis Result
 */
export interface SecurityAnalysis {
  riskLevel: RiskLevel
  score: number // 0-100
  threats: string[]
  recommendations: string[]
  indicators: SecurityIndicator[]
  timestamp: string
}

/**
 * Individual Security Indicator
 */
export interface SecurityIndicator {
  type: string
  value: string
  severity: RiskLevel
  description: string
}

/**
 * Threat Patterns - Regex patterns for common security threats
 */
const THREAT_PATTERNS = {
  // Phishing & Social Engineering
  phishing: {
    patterns: [
      /(?:verify|confirm|update).{0,20}(?:account|password|credit|bank)/i,
      /(?:urgent|immediate).{0,20}(?:action|response).{0,20}required/i,
      /(?:suspended|locked|compromised).{0,20}account/i,
      /click.{0,20}(?:here|link|below).{0,20}(?:verify|confirm)/i,
    ],
    severity: 'HIGH' as RiskLevel,
    type: 'PHISHING',
  },

  // Malware & Ransomware
  malware: {
    patterns: [
      /(?:download|install|run).{0,20}(?:exe|bat|cmd|ps1|vbs)/i,
      /(?:bitcoin|crypto|ransom).{0,20}(?:wallet|payment|transfer)/i,
      /(?:your files|data).{0,20}(?:encrypted|locked)/i,
    ],
    severity: 'HIGH' as RiskLevel,
    type: 'MALWARE',
  },

  // Credential Harvesting
  credentials: {
    patterns: [
      /(?:enter|provide|share).{0,20}(?:password|credentials|login)/i,
      /(?:api[_-]?key|secret[_-]?key|access[_-]?token)/i,
      /(?:ssh|private)[_-]?key/i,
    ],
    severity: 'HIGH' as RiskLevel,
    type: 'CREDENTIAL_HARVESTING',
  },

  // Suspicious URLs
  suspiciousUrls: {
    patterns: [
      /https?:\/\/(?:\d{1,3}\.){3}\d{1,3}/i, // IP-based URLs
      /https?:\/\/[^\/]*(?:bit\.ly|tinyurl|t\.co|goo\.gl)/i, // URL shorteners
      /https?:\/\/[^\/]*\.(tk|ml|ga|cf|gq)\//i, // Free TLDs often used for phishing
      /https?:\/\/[^\/]*-[^\/]*-[^\/]*\./i, // Multiple hyphens in domain
    ],
    severity: 'MEDIUM' as RiskLevel,
    type: 'SUSPICIOUS_URL',
  },

  // Data Exfiltration
  dataExfiltration: {
    patterns: [
      /(?:send|upload|transfer).{0,20}(?:database|backup|dump)/i,
      /(?:copy|export).{0,20}(?:all|customer|user).{0,20}data/i,
      /(?:select|show).{0,20}\*.{0,20}from/i, // SQL queries
    ],
    severity: 'MEDIUM' as RiskLevel,
    type: 'DATA_EXFILTRATION',
  },

  // Injection Attempts
  injection: {
    patterns: [
      /<script[^>]*>.*?<\/script>/is,
      /(?:union|select|insert|update|delete|drop).{0,20}(?:from|into|table)/i,
      /\$\{.*?\}|\{\{.*?\}\}/i, // Template injection
      /(?:eval|exec|system|shell_exec)\s*\(/i,
    ],
    severity: 'HIGH' as RiskLevel,
    type: 'INJECTION',
  },

  // Reconnaissance
  reconnaissance: {
    patterns: [
      /(?:what|which).{0,20}(?:version|software|os|system)/i,
      /(?:nmap|nikto|masscan|shodan)/i,
      /(?:enumerate|scan|probe).{0,20}(?:ports|services|network)/i,
    ],
    severity: 'LOW' as RiskLevel,
    type: 'RECONNAISSANCE',
  },
}

/**
 * Keyword Weights for Risk Scoring
 */
const RISK_KEYWORDS: Record<string, number> = {
  // High Risk (15-20 points)
  hack: 20,
  exploit: 20,
  vulnerability: 15,
  'zero-day': 20,
  backdoor: 20,
  rootkit: 20,
  ransomware: 20,
  malware: 18,
  trojan: 18,
  keylogger: 18,

  // Medium Risk (8-14 points)
  password: 10,
  credentials: 12,
  'api key': 14,
  token: 8,
  authentication: 8,
  bypass: 12,
  injection: 14,
  'xss': 14,
  'csrf': 14,
  'sql injection': 14,

  // Low Risk (3-7 points)
  security: 3,
  firewall: 5,
  encryption: 4,
  ssl: 3,
  https: 2,
  vpn: 4,
  patch: 5,
  update: 3,
}

/**
 * Analyzes a message for security threats
 */
export function analyzeMessage(
  message: string,
  userId: string,
  platform: string
): SecurityAnalysis {
  const startTime = Date.now()
  const indicators: SecurityIndicator[] = []
  const threats: string[] = []
  let totalScore = 0

  // Check threat patterns
  for (const [name, config] of Object.entries(THREAT_PATTERNS)) {
    for (const pattern of config.patterns) {
      const match = message.match(pattern)
      if (match) {
        indicators.push({
          type: config.type,
          value: match[0].substring(0, 50),
          severity: config.severity,
          description: `Detected ${name} pattern`,
        })
        threats.push(`${config.type}: ${name}`)

        // Add to score based on severity
        totalScore += config.severity === 'HIGH' ? 35 : config.severity === 'MEDIUM' ? 20 : 10
      }
    }
  }

  // Check risk keywords
  const lowerMessage = message.toLowerCase()
  for (const [keyword, weight] of Object.entries(RISK_KEYWORDS)) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      totalScore += weight
    }
  }

  // Check for sensitive data patterns
  const sensitivePatterns = [
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'EMAIL' },
    { pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g, type: 'CREDIT_CARD' },
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'SSN' },
    { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, type: 'IP_ADDRESS' },
  ]

  for (const { pattern, type } of sensitivePatterns) {
    const matches = message.match(pattern)
    if (matches && matches.length > 0) {
      indicators.push({
        type: 'SENSITIVE_DATA',
        value: `${type} detected`,
        severity: type === 'SSN' || type === 'CREDIT_CARD' ? 'HIGH' : 'LOW',
        description: `Found ${matches.length} ${type} pattern(s)`,
      })
      totalScore += type === 'SSN' || type === 'CREDIT_CARD' ? 25 : 5
    }
  }

  // Cap score at 100
  const normalizedScore = Math.min(100, totalScore)

  // Determine risk level
  const riskLevel: RiskLevel =
    normalizedScore >= 60 ? 'HIGH' : normalizedScore >= 30 ? 'MEDIUM' : 'LOW'

  // Generate recommendations
  const recommendations = generateRecommendations(riskLevel, indicators)

  const analysis: SecurityAnalysis = {
    riskLevel,
    score: normalizedScore,
    threats: [...new Set(threats)], // Deduplicate
    recommendations,
    indicators,
    timestamp: new Date().toISOString(),
  }

  // Log the analysis
  const processingTime = Date.now() - startTime
  structuredLog('SECURITY_ANALYSIS', {
    userId,
    platform,
    riskLevel,
    score: normalizedScore,
    threatCount: threats.length,
    indicatorCount: indicators.length,
    processingTimeMs: processingTime,
    messageLength: message.length,
  })

  return analysis
}

/**
 * Generates security recommendations based on analysis
 */
function generateRecommendations(
  riskLevel: RiskLevel,
  indicators: SecurityIndicator[]
): string[] {
  const recommendations: string[] = []

  if (riskLevel === 'HIGH') {
    recommendations.push('🚨 IMMEDIATE ACTION REQUIRED: This message contains high-risk indicators')
    recommendations.push('Do NOT click any links or download attachments')
    recommendations.push('Report this message to your security team immediately')
    recommendations.push('If credentials were shared, rotate them immediately')
  }

  if (riskLevel === 'MEDIUM') {
    recommendations.push('⚠️ Exercise caution with this message')
    recommendations.push('Verify the sender through a separate communication channel')
    recommendations.push('Scan any attachments with antivirus before opening')
  }

  // Add indicator-specific recommendations
  const indicatorTypes = new Set(indicators.map((i) => i.type))

  if (indicatorTypes.has('PHISHING')) {
    recommendations.push('Check the actual URL before clicking (hover to preview)')
    recommendations.push('Never enter credentials on unfamiliar websites')
  }

  if (indicatorTypes.has('CREDENTIAL_HARVESTING')) {
    recommendations.push('Never share passwords or API keys via chat')
    recommendations.push('Use a password manager for secure credential sharing')
  }

  if (indicatorTypes.has('INJECTION')) {
    recommendations.push('Sanitize and validate all user inputs')
    recommendations.push('Use parameterized queries for database operations')
  }

  if (indicatorTypes.has('SENSITIVE_DATA')) {
    recommendations.push('Avoid sharing PII (Personally Identifiable Information) in chat')
    recommendations.push('Use encrypted channels for sensitive data transfer')
  }

  if (riskLevel === 'LOW' && recommendations.length === 0) {
    recommendations.push('✅ No immediate threats detected')
    recommendations.push('Continue to practice security awareness')
  }

  return recommendations
}

/**
 * Formats the security analysis for display
 */
export function formatAnalysisReport(analysis: SecurityAnalysis): string {
  const riskEmoji = {
    LOW: '🟢',
    MEDIUM: '🟡',
    HIGH: '🔴',
  }

  let report = `\n${riskEmoji[analysis.riskLevel]} **Security Analysis Report**\n`
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  report += `**Risk Level:** ${analysis.riskLevel} (Score: ${analysis.score}/100)\n`
  report += `**Timestamp:** ${analysis.timestamp}\n\n`

  if (analysis.threats.length > 0) {
    report += `**🎯 Detected Threats:**\n`
    analysis.threats.forEach((threat) => {
      report += `  • ${threat}\n`
    })
    report += '\n'
  }

  if (analysis.indicators.length > 0) {
    report += `**🔍 Security Indicators:**\n`
    analysis.indicators.slice(0, 5).forEach((indicator) => {
      const emoji = indicator.severity === 'HIGH' ? '🔴' : indicator.severity === 'MEDIUM' ? '🟡' : '🟢'
      report += `  ${emoji} [${indicator.type}] ${indicator.description}\n`
    })
    if (analysis.indicators.length > 5) {
      report += `  ... and ${analysis.indicators.length - 5} more indicators\n`
    }
    report += '\n'
  }

  report += `**💡 Recommendations:**\n`
  analysis.recommendations.forEach((rec) => {
    report += `  ${rec}\n`
  })

  return report
}

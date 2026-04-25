import { z } from 'zod'

/**
 * Environment Variables Schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Discord Configuration
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_PUBLIC_KEY: z.string().min(1, 'DISCORD_PUBLIC_KEY is required'),
  DISCORD_APPLICATION_ID: z.string().min(1, 'DISCORD_APPLICATION_ID is required'),

  // Slack Configuration
  SLACK_BOT_TOKEN: z.string().min(1, 'SLACK_BOT_TOKEN is required'),
  SLACK_SIGNING_SECRET: z.string().min(1, 'SLACK_SIGNING_SECRET is required'),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // Optional: Redis for production state persistence
  REDIS_URL: z.string().optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validates environment variables and returns typed config
 * Throws descriptive errors if validation fails
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors.map((err) => {
      return `  ❌ ${err.path.join('.')}: ${err.message}`
    })

    console.error('\n🚨 ═══════════════════════════════════════════════════════════')
    console.error('   CYBERSECURITY AGENT - ENVIRONMENT VALIDATION FAILED')
    console.error('═══════════════════════════════════════════════════════════════')
    console.error('\nMissing or invalid environment variables:\n')
    console.error(errors.join('\n'))
    console.error('\n📋 Required environment variables:')
    console.error('   • DISCORD_TOKEN - Discord bot token')
    console.error('   • DISCORD_PUBLIC_KEY - Discord application public key')
    console.error('   • DISCORD_APPLICATION_ID - Discord application ID')
    console.error('   • SLACK_BOT_TOKEN - Slack bot OAuth token (xoxb-...)')
    console.error('   • SLACK_SIGNING_SECRET - Slack app signing secret')
    console.error('   • OPENAI_API_KEY - OpenAI API key for AI analysis')
    console.error('\n📋 Optional environment variables:')
    console.error('   • REDIS_URL - Redis URL for production state persistence')
    console.error('\n💡 Configure these in your Vercel Dashboard:')
    console.error('   Settings → Environment Variables')
    console.error('═══════════════════════════════════════════════════════════════\n')

    throw new Error('Environment validation failed. Check logs for details.')
  }

  console.log('✅ Environment variables validated successfully')
  return result.data
}

/**
 * Lazy-loaded environment config singleton
 * Only validates when first accessed
 */
let envConfig: Env | null = null

export function getEnv(): Env {
  if (!envConfig) {
    envConfig = validateEnv()
  }
  return envConfig
}

/**
 * Check if a specific platform is configured
 */
export function isPlatformConfigured(platform: 'discord' | 'slack'): boolean {
  try {
    const env = getEnv()
    if (platform === 'discord') {
      return !!(env.DISCORD_TOKEN && env.DISCORD_PUBLIC_KEY && env.DISCORD_APPLICATION_ID)
    }
    if (platform === 'slack') {
      return !!(env.SLACK_BOT_TOKEN && env.SLACK_SIGNING_SECRET)
    }
    return false
  } catch {
    return false
  }
}

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
 * Validates environment variables and logs a structured warning.
 * Returns the parsed data on success, or null on failure — never throws.
 * This keeps the app running in the preview even without real env vars.
 */
export function validateEnv(): Env | null {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors.map((err) => `  MISSING  ${err.path.join('.')}: ${err.message}`)

    console.warn('[CyberGuard] ================================================')
    console.warn('[CyberGuard] ENVIRONMENT VALIDATION WARNING')
    console.warn('[CyberGuard] ================================================')
    console.warn('[CyberGuard] Missing or invalid environment variables:')
    errors.forEach((e) => console.warn('[CyberGuard]' + e))
    console.warn('[CyberGuard]')
    console.warn('[CyberGuard] Required variables:')
    console.warn('[CyberGuard]   DISCORD_TOKEN, DISCORD_PUBLIC_KEY, DISCORD_APPLICATION_ID')
    console.warn('[CyberGuard]   SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET')
    console.warn('[CyberGuard]   OPENAI_API_KEY')
    console.warn('[CyberGuard]')
    console.warn('[CyberGuard] Optional: REDIS_URL')
    console.warn('[CyberGuard]')
    console.warn('[CyberGuard] Configure in Vercel Dashboard > Settings > Environment Variables')
    console.warn('[CyberGuard] ================================================')

    return null
  }

  console.log('[CyberGuard] Environment variables validated successfully')
  return result.data
}

/**
 * Lazy-loaded environment config singleton.
 * Returns null instead of throwing when vars are missing, so the Next.js
 * module graph can be imported without crashing during preview/build.
 */
let envConfig: Env | null | undefined = undefined

export function getEnv(): Env | null {
  if (envConfig === undefined) {
    envConfig = validateEnv()
  }
  return envConfig
}

/**
 * Check if a specific platform is configured
 */
export function isPlatformConfigured(platform: 'discord' | 'slack'): boolean {
  const env = getEnv()
  if (!env) return false
  if (platform === 'discord') {
    return !!(env.DISCORD_TOKEN && env.DISCORD_PUBLIC_KEY && env.DISCORD_APPLICATION_ID)
  }
  if (platform === 'slack') {
    return !!(env.SLACK_BOT_TOKEN && env.SLACK_SIGNING_SECRET)
  }
  return false
}

# 🛡️ CyberGuard AI - Cybersecurity Agent

A multi-platform AI-powered cybersecurity assistant built with ChatSDK that analyzes messages for security threats in real-time.

## Features

- **🔍 Real-time Threat Analysis**: Analyzes messages for phishing, malware, injection attacks, and more
- **📊 Risk Scoring**: Assigns risk levels (LOW/MEDIUM/HIGH) with scores from 0-100
- **🤖 AI-Powered Responses**: Uses OpenAI GPT-4 to provide contextual security guidance
- **📱 Multi-Platform Support**: Works on Discord and Slack simultaneously
- **📝 Session Tracking**: Maintains user history and risk profiles across platforms
- **📋 Structured Logging**: JSON logs for real-time monitoring in Vercel

## Architecture

```
src/
├── config/
│   └── env.ts              # Environment validation with Zod
├── core/
│   ├── securityAnalyzer.ts # Threat detection & risk scoring
│   ├── sessionStore.ts     # User session persistence
│   └── logger.ts           # Structured logging system
├── adapters/
│   ├── discord/            # Discord-specific adapter
│   ├── slack/              # Slack-specific adapter
│   └── index.ts            # Unified adapter exports
lib/
└── bot.tsx                 # Main ChatSDK bot instance
app/
└── api/
    ├── webhooks/[platform]/ # Platform webhook handlers
    └── health/              # Health check endpoint
```

## Environment Variables

Configure these in your **Vercel Dashboard** (Settings → Environment Variables):

### Required Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications) |
| `DISCORD_PUBLIC_KEY` | Discord application public key |
| `DISCORD_APPLICATION_ID` | Discord application ID |
| `SLACK_BOT_TOKEN` | Slack bot OAuth token (starts with `xoxb-`) |
| `SLACK_SIGNING_SECRET` | Slack app signing secret |
| `OPENAI_API_KEY` | OpenAI API key for AI responses |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis URL for production state persistence (defaults to in-memory) |

## Setup Instructions

### 1. Deploy to Vercel

```bash
# Clone and deploy
vercel
```

### 2. Configure Environment Variables

1. Go to your Vercel Dashboard
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add all required variables listed above

⚠️ **Never commit environment variables to your repository!**

### 3. Set Up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** → **Add Bot**
4. Copy the token → Set as `DISCORD_TOKEN`
5. Copy the public key → Set as `DISCORD_PUBLIC_KEY`
6. Copy the application ID → Set as `DISCORD_APPLICATION_ID`
7. Go to **OAuth2** → **URL Generator**
8. Select scopes: `bot`, `applications.commands`
9. Select permissions: `Send Messages`, `Read Message History`, `Add Reactions`
10. Use the generated URL to invite the bot to your server
11. Set the Interactions Endpoint URL: `https://your-domain.vercel.app/api/webhooks/discord`

### 4. Set Up Slack App

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app → **From manifest**
3. Use this manifest (update the URL):

```yaml
display_information:
  name: CyberGuard AI
  description: AI-powered cybersecurity assistant
features:
  bot_user:
    display_name: CyberGuard
    always_online: true
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - chat:write
      - im:history
      - reactions:write
settings:
  event_subscriptions:
    request_url: https://your-domain.vercel.app/api/webhooks/slack
    bot_events:
      - app_mention
      - message.channels
      - message.im
  interactivity:
    is_enabled: true
    request_url: https://your-domain.vercel.app/api/webhooks/slack
```

4. Install the app to your workspace
5. Copy **Bot User OAuth Token** → Set as `SLACK_BOT_TOKEN`
6. Copy **Signing Secret** → Set as `SLACK_SIGNING_SECRET`

## Usage

### Discord Commands

- `@CyberGuard <message>` - Analyze a message and get security guidance
- `!help` - Show help information
- `!analyze <message>` - Analyze specific text for threats
- `!summary` - View your security risk summary

### Slack Commands

- `@CyberGuard <message>` - Analyze a message and get security guidance
- `!help` - Show help information
- `!analyze <message>` - Analyze specific text for threats
- `!summary` - View your security risk summary

## Monitoring Logs

View real-time security analysis in Vercel logs:

```bash
vercel logs --follow
```

### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "SECURITY",
  "event": "SECURITY_ANALYSIS",
  "service": "cybersecurity-agent",
  "data": {
    "userId": "123456789",
    "platform": "discord",
    "riskLevel": "HIGH",
    "score": 75,
    "threatCount": 2,
    "processingTimeMs": 45
  }
}
```

### Risk Level Indicators

- 🔴 `HIGH` - Score ≥ 60, immediate threats detected
- 🟡 `MEDIUM` - Score 30-59, exercise caution
- 🟢 `LOW` - Score < 30, no immediate threats

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/discord` | POST | Discord webhook handler |
| `/api/webhooks/slack` | POST | Slack webhook handler |
| `/api/health` | GET | Health check & status |

## Security Features

The bot detects:

- 🎣 **Phishing**: Fake login pages, credential requests
- 🦠 **Malware**: Suspicious file downloads, ransomware patterns
- 🔐 **Credential Harvesting**: API key exposure, password requests
- 💉 **Injection Attacks**: SQL injection, XSS, template injection
- 📊 **Data Exfiltration**: Suspicious data transfer patterns
- 🔍 **Reconnaissance**: Port scanning, system enumeration

## License

MIT

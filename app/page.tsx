/**
 * app/page.tsx — SOC-Style Dashboard (Server Component)
 *
 * Reads live metrics from Upstash Redis at request time via getSocMetrics().
 * The health-check button is extracted to a Client Component so that the
 * rest of the page can remain a zero-JS Server Component.
 */

import { Shield, AlertTriangle, Activity, Users, Zap, MessageSquare, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSocMetrics } from '@/src/core/sessionStore'
import { isPlatformConfigured } from '@/src/config/env'
import HealthCheckButton from './HealthCheckButton'

// ─── Server Component ─────────────────────────────────────────────────────────

export default async function HomePage() {
  // Read live Redis metrics — happens server-side, no client bundle cost
  const metrics = await getSocMetrics().catch(() => ({
    threatsBlocked: 0,
    activeSessions: 0,
  }))

  const discordReady = isPlatformConfigured('discord')
  const slackReady   = isPlatformConfigured('slack')

  const statCards = [
    {
      label: 'Threats Blocked',
      value: metrics.threatsBlocked,
      icon: AlertTriangle,
      accent: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    {
      label: 'Active Sessions',
      value: metrics.activeSessions,
      icon: Users,
      accent: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      label: 'Platforms Online',
      value: [discordReady, slackReady].filter(Boolean).length,
      icon: Activity,
      accent: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
  ]

  const platforms = [
    {
      name: 'Discord',
      webhook: '/api/webhooks/discord',
      configured: discordReady,
    },
    {
      name: 'Slack',
      webhook: '/api/webhooks/slack',
      configured: slackReady,
    },
  ]

  const endpoints = [
    { path: '/api/webhooks/discord', label: 'Discord Webhook' },
    { path: '/api/webhooks/slack',   label: 'Slack Webhook'   },
    { path: '/api/health',           label: 'Health Check'    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 font-mono text-slate-100">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/15 p-2">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest">Security Operations Center</p>
              <h1 className="text-sm font-semibold text-white leading-none mt-0.5">CyberGuard AI</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-6 py-10">

        {/* ── KPI strip ────────────────────────────────────────────────── */}
        <section aria-label="Key metrics">
          <div className="grid gap-4 sm:grid-cols-3">
            {statCards.map(({ label, value, icon: Icon, accent, bg, border }) => (
              <div
                key={label}
                className={`rounded-xl border ${border} ${bg} p-6 flex items-center gap-4`}
              >
                <div className={`rounded-lg bg-slate-900/60 p-3`}>
                  <Icon className={`h-6 w-6 ${accent}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">{label}</p>
                  <p className={`text-3xl font-bold ${accent} tabular-nums`}>
                    {value.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Platform status + Health check ───────────────────────────── */}
        <section className="grid gap-6 lg:grid-cols-2">

          {/* Platform status panel */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Platform Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {platforms.map(({ name, webhook, configured }) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${configured ? 'bg-emerald-400' : 'bg-slate-600'}`}
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{name}</p>
                      <code className="text-xs text-slate-500">{webhook}</code>
                    </div>
                  </div>
                  <Badge
                    className={
                      configured
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-700 bg-slate-800 text-slate-500'
                    }
                    variant="outline"
                  >
                    {configured ? 'ACTIVE' : 'NOT CONFIGURED'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Health check (client island) */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                System Health
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Polls /api/health for live platform state
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HealthCheckButton />
            </CardContent>
          </Card>
        </section>

        {/* ── Threat categories reference ───────────────────────────────── */}
        <section>
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Detection Coverage
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Categories analyzed on every message
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Phishing',        icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-500/10'    },
                  { label: 'Malware / C2',    icon: Zap,           color: 'text-orange-400', bg: 'bg-orange-500/10' },
                  { label: 'Credential Theft',icon: Shield,        color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                  { label: 'SQL / XSS Inject',icon: Activity,      color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  { label: 'Data Exfil',      icon: ExternalLink,  color: 'text-pink-400',   bg: 'bg-pink-500/10'   },
                  { label: 'Reconnaissance',  icon: Users,         color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
                  { label: 'Suspicious URLs', icon: ExternalLink,  color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
                  { label: 'AI Chat Analysis',icon: MessageSquare, color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
                ].map(({ label, icon: Icon, color, bg }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-lg border border-slate-800 ${bg} px-3 py-2.5`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                    <span className={`text-xs font-medium ${color}`}>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── API endpoints reference ───────────────────────────────────── */}
        <section>
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Webhook Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {endpoints.map(({ path, label }) => (
                <div
                  key={path}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <code className="text-sm text-emerald-400">{path}</code>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-600" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span>CyberGuard AI — built with ChatSDK + Upstash Redis</span>
          </div>
          <span>Metrics refresh on every page load</span>
        </div>
      </footer>
    </div>
  )
}

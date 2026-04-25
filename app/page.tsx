'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  MessageSquare,
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  Github,
  ExternalLink,
} from 'lucide-react'

export default function HomePage() {
  const [testResult, setTestResult] = useState<{
    status: string
    platforms: Record<string, { configured: boolean; status: string }>
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const checkHealth = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setTestResult(data)
    } catch (error) {
      console.error('Health check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500/20 blur-xl" />
                <div className="relative rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 p-4">
                  <Shield className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              CyberGuard{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                AI
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              AI-powered cybersecurity assistant for Discord &amp; Slack. Analyzes messages in
              real-time to detect phishing, malware, and security threats.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                <Zap className="mr-1 h-3 w-3" /> Real-time Analysis
              </Badge>
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                <MessageSquare className="mr-1 h-3 w-3" /> Multi-Platform
              </Badge>
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                <Activity className="mr-1 h-3 w-3" /> Risk Scoring
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <div className="mb-2 w-fit rounded-lg bg-red-500/10 p-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <CardTitle className="text-white">Threat Detection</CardTitle>
              <CardDescription>
                Identifies phishing, malware, credential harvesting, and injection attacks in
                real-time
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <div className="mb-2 w-fit rounded-lg bg-emerald-500/10 p-2">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <CardTitle className="text-white">Risk Scoring</CardTitle>
              <CardDescription>
                Assigns risk levels (LOW/MEDIUM/HIGH) with scores from 0-100 based on detected
                indicators
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <div className="mb-2 w-fit rounded-lg bg-cyan-500/10 p-2">
                <MessageSquare className="h-5 w-5 text-cyan-500" />
              </div>
              <CardTitle className="text-white">AI Responses</CardTitle>
              <CardDescription>
                Uses GPT-4 to provide contextual security guidance and actionable recommendations
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Health Check Section */}
      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-white">System Status</CardTitle>
            <CardDescription>Check if the bot is properly configured and running</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <Button
                onClick={checkHealth}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? 'Checking...' : 'Check Health'}
              </Button>
            </div>

            {testResult && (
              <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <Badge
                    variant={testResult.status === 'healthy' ? 'default' : 'destructive'}
                    className={
                      testResult.status === 'healthy'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : ''
                    }
                  >
                    {testResult.status === 'healthy' ? (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    ) : (
                      <AlertTriangle className="mr-1 h-3 w-3" />
                    )}
                    {testResult.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <span className="text-sm text-slate-400">Platforms</span>
                  <div className="grid gap-2">
                    {Object.entries(testResult.platforms).map(([platform, info]) => (
                      <div
                        key={platform}
                        className="flex items-center justify-between rounded bg-slate-900 px-3 py-2"
                      >
                        <span className="font-mono text-sm capitalize text-white">{platform}</span>
                        <Badge
                          variant={info.configured ? 'default' : 'secondary'}
                          className={
                            info.configured
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-700 text-slate-400'
                          }
                        >
                          {info.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Endpoints Section */}
      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">API Endpoints</CardTitle>
            <CardDescription>Webhook URLs for platform integration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { path: '/api/webhooks/discord', label: 'Discord Webhook' },
              { path: '/api/webhooks/slack', label: 'Slack Webhook' },
              { path: '/api/health', label: 'Health Check' },
            ].map((endpoint) => (
              <div
                key={endpoint.path}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-slate-400">{endpoint.label}</p>
                  <code className="font-mono text-sm text-emerald-400">{endpoint.path}</code>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-500" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              <span className="text-slate-400">CyberGuard AI</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>Built with ChatSDK</span>
              <span>•</span>
              <a href="#" className="flex items-center gap-1 hover:text-white">
                <Github className="h-4 w-4" /> Source
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

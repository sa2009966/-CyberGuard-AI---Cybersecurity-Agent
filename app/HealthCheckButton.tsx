'use client'

import { useState } from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'

interface HealthResult {
  status: string
  platforms: Record<string, { configured: boolean; status: string }>
}

export default function HealthCheckButton() {
  const [result, setResult]   = useState<HealthResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const check = async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/health')
      const data = await res.json() as HealthResult
      setResult(data)
    } catch {
      setError('Health check request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={check}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs tracking-widest uppercase"
      >
        {loading ? <Spinner className="mr-2 h-3 w-3" /> : null}
        {loading ? 'Polling...' : 'Run Health Check'}
      </Button>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          {/* Overall status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase tracking-widest">Overall</span>
            <Badge
              variant="outline"
              className={
                result.status === 'healthy'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }
            >
              {result.status === 'healthy'
                ? <CheckCircle className="mr-1 h-3 w-3" />
                : <AlertTriangle className="mr-1 h-3 w-3" />}
              {result.status.toUpperCase()}
            </Badge>
          </div>

          {/* Per-platform rows */}
          <div className="space-y-2">
            {Object.entries(result.platforms).map(([platform, info]) => (
              <div
                key={platform}
                className="flex items-center justify-between rounded border border-slate-800 bg-slate-900 px-3 py-2"
              >
                <span className="text-xs font-medium capitalize text-white">{platform}</span>
                <Badge
                  variant="outline"
                  className={
                    info.configured
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-700 bg-slate-800 text-slate-500'
                  }
                >
                  {info.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { Flag } from 'lucide-react'

interface FeatureFlag {
  id: string
  feature_key: string
  is_enabled: boolean
  description: string | null
  config: Record<string, unknown>
  updated_at: string
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function fetchFlags() {
    setLoading(true)
    const res = await fetch('/api/admin/feature-flags')
    const data = await res.json()
    setFlags(data.flags || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchFlags()
  }, [])

  async function handleToggle(flag: FeatureFlag) {
    setUpdating(flag.id)
    const res = await fetch('/api/admin/feature-flags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature_key: flag.feature_key,
        is_enabled: !flag.is_enabled,
      }),
    })

    if (res.ok) {
      setFlags((prev) =>
        prev.map((f) =>
          f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f
        )
      )
    }
    setUpdating(null)
  }

  function formatFlagName(key: string): string {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feature Flags</h1>
        <p className="text-muted-foreground">
          Control platform-wide features and settings
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : flags.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Flag className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No feature flags configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {flags.map((flag) => (
            <Card key={flag.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  {formatFlagName(flag.feature_key)}
                </CardTitle>
                <CardDescription>
                  {flag.description || `Control the ${flag.feature_key} feature`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={flag.id}
                      checked={flag.is_enabled}
                      onCheckedChange={() => handleToggle(flag)}
                      disabled={updating === flag.id}
                    />
                    <Label htmlFor={flag.id} className="cursor-pointer">
                      {flag.is_enabled ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(flag.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

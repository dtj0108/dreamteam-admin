'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Cpu,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ModelProviderConfig } from '@/types/model-providers'
import { PROVIDER_INFO } from '@/types/model-providers'
import type { AIProvider } from '@/types/agents'

interface ProviderTestCardProps {
  providers: ModelProviderConfig[]
  loading?: boolean
  onRefresh?: () => void
}

interface TestResult {
  success: boolean
  error?: string
  latency_ms?: number
}

export function ProviderTestCards({ providers, loading, onRefresh }: ProviderTestCardProps) {
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [testDialog, setTestDialog] = useState<{
    open: boolean
    provider: ModelProviderConfig | null
  }>({ open: false, provider: null })
  const [customApiKey, setCustomApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testingCustom, setTestingCustom] = useState(false)
  const [customResult, setCustomResult] = useState<TestResult | null>(null)

  async function runQuickTest(provider: ModelProviderConfig) {
    setTestingProvider(provider.provider)

    try {
      const res = await fetch('/api/admin/model-providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.provider })
      })

      const data = await res.json()
      setTestResults(prev => ({
        ...prev,
        [provider.provider]: {
          success: data.success,
          error: data.error,
          latency_ms: data.latency_ms
        }
      }))
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [provider.provider]: {
          success: false,
          error: 'Failed to run test'
        }
      }))
    } finally {
      setTestingProvider(null)
    }
  }

  function openTestDialog(provider: ModelProviderConfig) {
    setTestDialog({ open: true, provider })
    setCustomApiKey('')
    setShowApiKey(false)
    setCustomResult(null)
  }

  function closeTestDialog() {
    setTestDialog({ open: false, provider: null })
    setCustomApiKey('')
    setShowApiKey(false)
    setCustomResult(null)
  }

  async function testCustomKey() {
    if (!testDialog.provider || !customApiKey.trim()) return

    setTestingCustom(true)
    setCustomResult(null)

    try {
      const res = await fetch('/api/admin/model-providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: testDialog.provider.provider,
          api_key: customApiKey.trim()
        })
      })

      const data = await res.json()
      setCustomResult({
        success: data.success,
        error: data.error,
        latency_ms: data.latency_ms
      })
    } catch (err) {
      setCustomResult({
        success: false,
        error: 'Failed to test API key'
      })
    } finally {
      setTestingCustom(false)
    }
  }

  function getProviderIcon(provider: AIProvider) {
    switch (provider) {
      case 'anthropic':
        return 'A'
      case 'xai':
        return 'X'
      default:
        return '?'
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="animate-pulse h-6 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="animate-pulse h-10 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map(provider => {
          const info = PROVIDER_INFO[provider.provider]
          const result = testResults[provider.provider]

          return (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                      {getProviderIcon(provider.provider)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{info.name}</CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={provider.is_enabled ? 'default' : 'secondary'}>
                    {provider.is_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {provider.has_api_key ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">API Key Configured</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Not Configured</span>
                      </>
                    )}
                  </div>
                  {provider.last_validated_at && (
                    <span className="text-xs text-muted-foreground">
                      Last tested {formatDistanceToNow(new Date(provider.last_validated_at), { addSuffix: true })}
                    </span>
                  )}
                </div>

                {/* Test Result */}
                {result && (
                  <div
                    className={`rounded-md p-3 text-sm ${
                      result.success
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {result.success ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Connection successful</span>
                        {result.latency_ms && (
                          <span className="flex items-center gap-1 ml-auto text-xs">
                            <Clock className="h-3 w-3" />
                            {result.latency_ms}ms
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 mt-0.5" />
                        <span>{result.error}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => runQuickTest(provider)}
                    disabled={!provider.has_api_key || testingProvider === provider.provider}
                  >
                    {testingProvider === provider.provider ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Cpu className="mr-2 h-4 w-4" />
                    )}
                    Quick Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTestDialog(provider)}
                  >
                    Test Custom Key
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={info.docsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Test Custom Key Dialog */}
      <Dialog open={testDialog.open} onOpenChange={(open) => !open && closeTestDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Test {testDialog.provider && PROVIDER_INFO[testDialog.provider.provider].name} API Key
            </DialogTitle>
            <DialogDescription>
              Enter an API key to test connectivity without saving it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="test-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Enter API key to test..."
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {customResult && (
              <div
                className={`rounded-md p-3 text-sm ${
                  customResult.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {customResult.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Connection successful ({customResult.latency_ms}ms)</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 mt-0.5" />
                    <span>{customResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeTestDialog}>
              Close
            </Button>
            <Button
              onClick={testCustomKey}
              disabled={!customApiKey.trim() || testingCustom}
            >
              {testingCustom ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

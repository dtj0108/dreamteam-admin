'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDistanceToNow } from 'date-fns'
import { Cpu, CheckCircle2, XCircle, Loader2, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { ModelProviderConfig } from '@/types/model-providers'
import { PROVIDER_INFO } from '@/types/model-providers'
import type { AIProvider } from '@/types/agents'

export default function ModelProvidersPage() {
  const [providers, setProviders] = useState<ModelProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [configDialog, setConfigDialog] = useState<{
    open: boolean
    provider: ModelProviderConfig | null
  }>({ open: false, provider: null })
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/model-providers')
    const data = await res.json()
    setProviders(data.providers || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  function openConfigDialog(provider: ModelProviderConfig) {
    setConfigDialog({ open: true, provider })
    setApiKeyInput('')
    setShowApiKey(false)
  }

  function closeConfigDialog() {
    setConfigDialog({ open: false, provider: null })
    setApiKeyInput('')
    setShowApiKey(false)
  }

  async function handleToggleEnabled(provider: ModelProviderConfig) {
    const res = await fetch('/api/admin/model-providers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: provider.provider,
        is_enabled: !provider.is_enabled
      })
    })

    if (res.ok) {
      fetchProviders()
    }
  }

  async function handleSaveApiKey() {
    if (!configDialog.provider) return

    setSaving(true)

    const res = await fetch('/api/admin/model-providers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: configDialog.provider.provider,
        api_key: apiKeyInput.trim() || null
      })
    })

    if (res.ok) {
      fetchProviders()
      closeConfigDialog()
    }
    setSaving(false)
  }

  async function handleRemoveApiKey() {
    if (!configDialog.provider) return

    setSaving(true)

    const res = await fetch('/api/admin/model-providers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: configDialog.provider.provider,
        api_key: null
      })
    })

    if (res.ok) {
      fetchProviders()
      closeConfigDialog()
    }
    setSaving(false)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Model Providers</h1>
        <p className="text-muted-foreground">
          Configure API keys for AI model providers
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No providers configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => {
            const info = PROVIDER_INFO[provider.provider]
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
                    <Switch
                      checked={provider.is_enabled}
                      onCheckedChange={() => handleToggleEnabled(provider)}
                      disabled={!provider.has_api_key}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {provider.has_api_key ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">API Key Configured</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Not Configured</span>
                        </>
                      )}
                    </div>
                    <Badge variant={provider.is_enabled ? 'default' : 'secondary'}>
                      {provider.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>

                  {provider.last_validated_at && (
                    <p className="text-xs text-muted-foreground">
                      Last tested {formatDistanceToNow(new Date(provider.last_validated_at), { addSuffix: true })}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openConfigDialog(provider)}
                    >
                      Configure
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
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
      )}

      <Dialog open={configDialog.open} onOpenChange={(open) => !open && closeConfigDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Configure {configDialog.provider && PROVIDER_INFO[configDialog.provider.provider].name}
            </DialogTitle>
            <DialogDescription>
              Enter your API key to enable this provider. The key will be encrypted before storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={configDialog.provider?.has_api_key ? '••••••••••••••••' : 'Enter API key'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
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
              {configDialog.provider?.has_api_key && (
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep existing key, or enter a new key to replace it.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {configDialog.provider?.has_api_key && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveApiKey}
                disabled={saving}
                className="sm:mr-auto"
              >
                Remove Key
              </Button>
            )}
            <Button variant="outline" onClick={closeConfigDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveApiKey}
              disabled={saving || (!apiKeyInput.trim() && !configDialog.provider?.has_api_key)}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

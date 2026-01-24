'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProviderTestCards } from '@/components/admin/testing'
import { ArrowLeft, Cpu } from 'lucide-react'
import type { ModelProviderConfig } from '@/types/model-providers'

export default function ProviderTestingPage() {
  const [providers, setProviders] = useState<ModelProviderConfig[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/model-providers')
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers || [])
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/testing">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Hub
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Cpu className="h-8 w-8" />
          Provider Testing
        </h1>
        <p className="text-muted-foreground">
          Test API key connectivity for model providers
        </p>
      </div>

      {providers.length === 0 && !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Providers Configured</p>
            <p className="text-sm text-muted-foreground">
              Configure model providers to test their connectivity
            </p>
            <Link href="/admin/model-providers">
              <Button variant="outline" className="mt-4">
                Go to Model Providers
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ProviderTestCards
          providers={providers}
          loading={loading}
          onRefresh={fetchProviders}
        />
      )}
    </div>
  )
}

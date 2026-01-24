import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import type { AIProvider } from '@/types/agents'

// API endpoints for testing
const PROVIDER_TEST_CONFIG: Record<AIProvider, {
  url: string
  headers: (apiKey: string) => Record<string, string>
  body: Record<string, unknown>
  validateResponse: (data: unknown) => boolean
}> = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }),
    body: {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    },
    validateResponse: (data) => {
      const d = data as { content?: unknown[] }
      return Array.isArray(d?.content)
    }
  },
  xai: {
    url: 'https://api.x.ai/v1/chat/completions',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    body: {
      model: 'grok-3-mini',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    },
    validateResponse: (data) => {
      const d = data as { choices?: unknown[] }
      return Array.isArray(d?.choices)
    }
  }
}

// POST /api/admin/model-providers/test - Test an API key
export async function POST(request: NextRequest) {
  const { error, user: admin } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { provider, api_key } = body as { provider: AIProvider; api_key: string }

  if (!provider || !api_key) {
    return NextResponse.json(
      { error: 'Provider and API key are required' },
      { status: 400 }
    )
  }

  const config = PROVIDER_TEST_CONFIG[provider]
  if (!config) {
    return NextResponse.json(
      { error: `Unknown provider: ${provider}` },
      { status: 400 }
    )
  }

  const startTime = Date.now()

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: config.headers(api_key),
      body: JSON.stringify(config.body),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = (errorData as { error?: { message?: string } }).error?.message
        || response.statusText
        || 'API request failed'

      return NextResponse.json({
        success: false,
        error: `API error ${response.status}: ${errorMessage}`,
        latency_ms: latencyMs
      })
    }

    const data = await response.json()

    if (!config.validateResponse(data)) {
      return NextResponse.json({
        success: false,
        error: 'Unexpected API response format',
        latency_ms: latencyMs
      })
    }

    // Update last_validated_at in database
    const supabase = createAdminClient()
    await supabase
      .from('model_provider_configs')
      .update({ last_validated_at: new Date().toISOString() })
      .eq('provider', provider)

    // Log the test action
    await logAdminAction(
      admin!.id,
      'model_provider_tested',
      'model_provider',
      null,
      { provider, success: true, latency_ms: latencyMs },
      request
    )

    return NextResponse.json({
      success: true,
      latency_ms: latencyMs
    })

  } catch (err) {
    const latencyMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    return NextResponse.json({
      success: false,
      error: errorMessage.includes('timeout')
        ? 'Request timed out (15s)'
        : errorMessage,
      latency_ms: latencyMs
    })
  }
}

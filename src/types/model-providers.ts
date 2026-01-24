import type { AIProvider } from './agents'

export interface ModelProviderConfig {
  id: string
  provider: AIProvider
  is_enabled: boolean
  config: Record<string, unknown>
  last_validated_at: string | null
  created_at: string
  updated_at: string
  // Note: api_key_encrypted never sent to frontend
  has_api_key: boolean  // Computed field
}

export interface UpdateProviderRequest {
  provider: AIProvider
  api_key?: string
  is_enabled?: boolean
  config?: Record<string, unknown>
}

export interface TestProviderRequest {
  provider: AIProvider
  api_key: string
}

export interface TestProviderResponse {
  success: boolean
  error?: string
  latency_ms: number
}

// Provider display info
export const PROVIDER_INFO: Record<AIProvider, {
  name: string
  description: string
  docsUrl: string
}> = {
  anthropic: {
    name: 'Anthropic (Claude)',
    description: 'Claude models for advanced reasoning and analysis',
    docsUrl: 'https://console.anthropic.com/settings/keys'
  },
  xai: {
    name: 'xAI (Grok)',
    description: 'Grok models for fast, efficient responses',
    docsUrl: 'https://console.x.ai/team/api-keys'
  }
}

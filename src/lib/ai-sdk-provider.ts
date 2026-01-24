// AI SDK Provider - Multi-provider support for AI SDK 4.x
// Supports Anthropic Claude and xAI Grok providers

import { createAnthropic } from '@ai-sdk/anthropic'
import { createXai } from '@ai-sdk/xai'
import type { AIProvider } from '@/types/agents'

// Lazy-initialized provider instances
let anthropicInstance: ReturnType<typeof createAnthropic> | null = null
let xaiInstance: ReturnType<typeof createXai> | null = null

/**
 * Get a provider instance by type (lazy initialization)
 */
export function getProvider(provider: AIProvider) {
  switch (provider) {
    case 'anthropic':
      if (!anthropicInstance) {
        anthropicInstance = createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        })
      }
      return anthropicInstance
    case 'xai':
      if (!xaiInstance) {
        xaiInstance = createXai({
          apiKey: process.env.XAI_API_KEY,
        })
      }
      return xaiInstance
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * Get a model instance for a given provider and model ID
 */
export function getModelInstance(provider: AIProvider, modelId: string) {
  return getProvider(provider)(modelId)
}

// Keep backward compatibility - export anthropic instance directly
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Model mapping from friendly names to full model IDs (per provider)
export const MODEL_MAP: Record<AIProvider, Record<string, string>> = {
  anthropic: {
    haiku: 'claude-haiku-4-5-20251001',
    sonnet: 'claude-sonnet-4-5-20250929',
    opus: 'claude-opus-4-5-20251101',
  },
  xai: {
    'grok-4-fast': 'grok-4-fast',
    'grok-3': 'grok-3',
    'grok-3-mini': 'grok-3-mini',
    'grok-2': 'grok-2',
  },
}

// Legacy MODEL_MAP for backward compatibility
export const LEGACY_MODEL_MAP = MODEL_MAP.anthropic

export type ModelShortName = keyof typeof LEGACY_MODEL_MAP
export type ModelFullName = (typeof LEGACY_MODEL_MAP)[ModelShortName]

// Model pricing per 1M tokens (in USD)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic Claude models
  'claude-sonnet-4-5-20250514': { input: 3.0, output: 15.0 },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-opus-4-5-20250514': { input: 15.0, output: 75.0 },
  'claude-opus-4-5-20251101': { input: 15.0, output: 75.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  // xAI Grok models (pricing as of Jan 2025, verify current rates)
  'grok-4-fast': { input: 2.0, output: 10.0 },
  'grok-3': { input: 5.0, output: 25.0 },
  'grok-3-mini': { input: 0.5, output: 2.5 },
  'grok-2': { input: 2.0, output: 10.0 },
}

// Cache pricing modifiers (relative to input price) - Anthropic only
export const CACHE_WRITE_MULTIPLIER = 1.25 // 25% more than input
export const CACHE_READ_MULTIPLIER = 0.1  // 90% less than input (10% of input price)

// Provider feature flags
export const PROVIDER_FEATURES: Record<AIProvider, {
  supportsCaching: boolean
  supportsReasoningEffort: boolean
}> = {
  anthropic: { supportsCaching: true, supportsReasoningEffort: false },
  xai: { supportsCaching: false, supportsReasoningEffort: true },
}

/**
 * Get model pricing, defaulting to Sonnet pricing if unknown
 */
export function getModelPricing(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-5-20250929']
}

/**
 * Resolve a model short name to its full model ID
 * Optionally accepts provider for provider-specific resolution
 */
export function resolveModelName(model: string, provider: AIProvider = 'anthropic'): string {
  const providerModels = MODEL_MAP[provider]
  if (providerModels && model in providerModels) {
    return providerModels[model]
  }
  // Also check legacy anthropic map for backward compatibility
  if (model in LEGACY_MODEL_MAP) {
    return LEGACY_MODEL_MAP[model as ModelShortName]
  }
  return model
}

/**
 * Get the provider for a given model (auto-detect)
 */
export function getProviderForModel(model: string): AIProvider {
  // Check if it's an xAI model
  if (model.startsWith('grok-')) {
    return 'xai'
  }
  // Check model maps
  for (const [provider, models] of Object.entries(MODEL_MAP)) {
    if (model in models) {
      return provider as AIProvider
    }
  }
  // Default to anthropic
  return 'anthropic'
}

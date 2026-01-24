import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getProvider,
  getProviderWithApiKey,
  MODEL_MAP,
  LEGACY_MODEL_MAP,
  MODEL_PRICING,
  PROVIDER_FEATURES,
  getModelPricing,
  resolveModelName,
  getProviderForModel,
} from '@/lib/ai-sdk-provider'

// Mock the AI SDK providers
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn().mockImplementation((config) => {
    const provider = vi.fn().mockImplementation((modelId: string) => ({
      modelId,
      config,
    }))
    provider.config = config
    return provider
  }),
}))

vi.mock('@ai-sdk/xai', () => ({
  createXai: vi.fn().mockImplementation((config) => {
    const provider = vi.fn().mockImplementation((modelId: string) => ({
      modelId,
      config,
    }))
    provider.config = config
    return provider
  }),
}))

describe('ai-sdk-provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      XAI_API_KEY: 'test-xai-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('getProvider', () => {
    it('returns anthropic provider for anthropic type', async () => {
      const { getProvider: freshGetProvider } = await import('@/lib/ai-sdk-provider')
      const provider = freshGetProvider('anthropic')

      expect(provider).toBeDefined()
      expect(typeof provider).toBe('function')
    })

    it('returns xai provider for xai type', async () => {
      const { getProvider: freshGetProvider } = await import('@/lib/ai-sdk-provider')
      const provider = freshGetProvider('xai')

      expect(provider).toBeDefined()
      expect(typeof provider).toBe('function')
    })

    it('throws for unknown provider', () => {
      expect(() => getProvider('unknown' as 'anthropic')).toThrow('Unknown provider')
    })

    it('caches provider instances (lazy initialization)', async () => {
      const { getProvider: freshGetProvider } = await import('@/lib/ai-sdk-provider')

      const provider1 = freshGetProvider('anthropic')
      const provider2 = freshGetProvider('anthropic')

      expect(provider1).toBe(provider2)
    })
  })

  describe('getProviderWithApiKey', () => {
    it('creates new provider instance with specific API key', () => {
      const provider = getProviderWithApiKey('anthropic', 'custom-api-key')
      expect(provider).toBeDefined()
      expect(typeof provider).toBe('function')
    })

    it('does not cache providers (creates fresh instance each time)', () => {
      const provider1 = getProviderWithApiKey('anthropic', 'key-1')
      const provider2 = getProviderWithApiKey('anthropic', 'key-2')

      // Should be different instances
      expect(provider1).not.toBe(provider2)
    })
  })

  describe('resolveModelName', () => {
    it('maps sonnet to claude-sonnet-4-5-20250929', () => {
      const resolved = resolveModelName('sonnet')
      expect(resolved).toBe('claude-sonnet-4-5-20250929')
    })

    it('maps haiku to claude-haiku-4-5-20251001', () => {
      const resolved = resolveModelName('haiku')
      expect(resolved).toBe('claude-haiku-4-5-20251001')
    })

    it('maps opus to claude-opus-4-5-20251101', () => {
      const resolved = resolveModelName('opus')
      expect(resolved).toBe('claude-opus-4-5-20251101')
    })

    it('returns original name for unknown models', () => {
      const unknown = 'unknown-model-xyz'
      expect(resolveModelName(unknown)).toBe(unknown)
    })

    it('respects provider-specific model resolution', () => {
      expect(resolveModelName('grok-4-fast', 'xai')).toBe('grok-4-fast')
      expect(resolveModelName('grok-3', 'xai')).toBe('grok-3')
    })
  })

  describe('getProviderForModel', () => {
    it('detects xai from grok- prefix', () => {
      expect(getProviderForModel('grok-4-fast')).toBe('xai')
      expect(getProviderForModel('grok-3')).toBe('xai')
      expect(getProviderForModel('grok-3-mini')).toBe('xai')
      expect(getProviderForModel('grok-2')).toBe('xai')
    })

    it('detects anthropic for claude models', () => {
      expect(getProviderForModel('sonnet')).toBe('anthropic')
      expect(getProviderForModel('haiku')).toBe('anthropic')
      expect(getProviderForModel('opus')).toBe('anthropic')
    })

    it('defaults to anthropic for unknown models', () => {
      expect(getProviderForModel('unknown-model')).toBe('anthropic')
    })
  })

  describe('getModelPricing', () => {
    it('returns correct pricing for claude-sonnet-4-5-20250929', () => {
      const pricing = getModelPricing('claude-sonnet-4-5-20250929')
      expect(pricing).toEqual({ input: 3.0, output: 15.0 })
    })

    it('returns correct pricing for claude-opus-4-5-20251101', () => {
      const pricing = getModelPricing('claude-opus-4-5-20251101')
      expect(pricing).toEqual({ input: 15.0, output: 75.0 })
    })

    it('returns correct pricing for claude-haiku-4-5-20251001', () => {
      const pricing = getModelPricing('claude-haiku-4-5-20251001')
      expect(pricing).toEqual({ input: 0.8, output: 4.0 })
    })

    it('returns correct pricing for grok models', () => {
      expect(getModelPricing('grok-4-fast')).toEqual({ input: 2.0, output: 10.0 })
      expect(getModelPricing('grok-3')).toEqual({ input: 5.0, output: 25.0 })
      expect(getModelPricing('grok-3-mini')).toEqual({ input: 0.5, output: 2.5 })
    })

    it('defaults to sonnet pricing for unknown models', () => {
      const pricing = getModelPricing('unknown-model')
      expect(pricing).toEqual(MODEL_PRICING['claude-sonnet-4-5-20250929'])
    })
  })

  describe('PROVIDER_FEATURES', () => {
    it('has correct features for anthropic', () => {
      expect(PROVIDER_FEATURES.anthropic).toEqual({
        supportsCaching: true,
        supportsReasoningEffort: false,
      })
    })

    it('has correct features for xai', () => {
      expect(PROVIDER_FEATURES.xai).toEqual({
        supportsCaching: false,
        supportsReasoningEffort: true,
      })
    })
  })

  describe('MODEL_MAP', () => {
    it('has all anthropic models', () => {
      expect(MODEL_MAP.anthropic).toHaveProperty('haiku')
      expect(MODEL_MAP.anthropic).toHaveProperty('sonnet')
      expect(MODEL_MAP.anthropic).toHaveProperty('opus')
    })

    it('has all xai models', () => {
      expect(MODEL_MAP.xai).toHaveProperty('grok-4-fast')
      expect(MODEL_MAP.xai).toHaveProperty('grok-3')
      expect(MODEL_MAP.xai).toHaveProperty('grok-3-mini')
      expect(MODEL_MAP.xai).toHaveProperty('grok-2')
    })
  })

  describe('LEGACY_MODEL_MAP', () => {
    it('is equivalent to MODEL_MAP.anthropic', () => {
      expect(LEGACY_MODEL_MAP).toEqual(MODEL_MAP.anthropic)
    })
  })
})

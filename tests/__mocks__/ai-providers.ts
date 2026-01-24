import { vi } from 'vitest'

// Mock AI provider response
export interface MockAIResponse {
  content: Array<{
    type: string
    text?: string
    name?: string
    input?: Record<string, unknown>
  }>
  model: string
  stop_reason: string
}

// Create a mock tool use response
export function createMockToolUseResponse(
  toolName: string,
  input: Record<string, unknown>
): MockAIResponse {
  return {
    content: [
      {
        type: 'tool_use',
        name: toolName,
        input,
      },
    ],
    model: 'claude-sonnet-4-5-20250929',
    stop_reason: 'tool_use',
  }
}

// Create a mock text response
export function createMockTextResponse(text: string): MockAIResponse {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
    model: 'claude-sonnet-4-5-20250929',
    stop_reason: 'end_turn',
  }
}

// Mock Anthropic provider
export const mockAnthropicProvider = vi.fn().mockImplementation((modelId: string) => ({
  modelId,
  doGenerate: vi.fn().mockResolvedValue({
    text: 'Mock response',
    usage: { promptTokens: 100, completionTokens: 50 },
  }),
}))

// Mock xAI provider
export const mockXaiProvider = vi.fn().mockImplementation((modelId: string) => ({
  modelId,
  doGenerate: vi.fn().mockResolvedValue({
    text: 'Mock response',
    usage: { promptTokens: 100, completionTokens: 50 },
  }),
}))

// Mock createAnthropic
export const mockCreateAnthropic = vi.fn().mockReturnValue(mockAnthropicProvider)

// Mock createXai
export const mockCreateXai = vi.fn().mockReturnValue(mockXaiProvider)

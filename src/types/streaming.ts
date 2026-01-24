// Streaming types for real-time agent execution with extended thinking support

import type { AIProvider } from './agents'

/**
 * Stream event types for agent execution
 */
export type StreamEventType =
  | 'text_delta'       // Partial text output
  | 'reasoning_delta'  // Extended thinking content (Anthropic only)
  | 'tool_call_start'  // Tool execution starting
  | 'tool_call_end'    // Tool args complete
  | 'tool_result'      // Tool finished with result
  | 'todo_update'      // TodoWrite called
  | 'error'            // Error occurred
  | 'done'             // Stream complete with usage

/**
 * Base stream event
 */
export interface BaseStreamEvent {
  type: StreamEventType
  timestamp: string
}

/**
 * Text delta event - partial text from the model
 */
export interface TextDeltaEvent extends BaseStreamEvent {
  type: 'text_delta'
  content: string
}

/**
 * Reasoning delta event - extended thinking content
 */
export interface ReasoningDeltaEvent extends BaseStreamEvent {
  type: 'reasoning_delta'
  content: string
}

/**
 * Tool call start event - tool execution is beginning
 */
export interface ToolCallStartEvent extends BaseStreamEvent {
  type: 'tool_call_start'
  toolCallId: string
  toolName: string
}

/**
 * Tool call end event - tool call arguments are complete
 */
export interface ToolCallEndEvent extends BaseStreamEvent {
  type: 'tool_call_end'
  toolCallId: string
  toolName: string
  input: Record<string, unknown>
}

/**
 * Tool result event - tool execution completed
 */
export interface ToolResultEvent extends BaseStreamEvent {
  type: 'tool_result'
  toolCallId: string
  toolName: string
  result: unknown
  success: boolean
  latencyMs?: number
}

/**
 * Todo update event - TodoWrite tool was called
 */
export interface TodoUpdateEvent extends BaseStreamEvent {
  type: 'todo_update'
  todos: Array<{
    content: string
    status: 'pending' | 'in_progress' | 'completed'
    activeForm: string
  }>
}

/**
 * Error event - an error occurred during streaming
 */
export interface ErrorEvent extends BaseStreamEvent {
  type: 'error'
  error: string
  code?: string
}

/**
 * Done event - stream completed
 */
export interface DoneEvent extends BaseStreamEvent {
  type: 'done'
  result: string
  usage: {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens?: number
    cacheReadTokens?: number
    totalCost?: number
  }
}

/**
 * Union type of all stream events
 */
export type StreamEvent =
  | TextDeltaEvent
  | ReasoningDeltaEvent
  | ToolCallStartEvent
  | ToolCallEndEvent
  | ToolResultEvent
  | TodoUpdateEvent
  | ErrorEvent
  | DoneEvent

/**
 * Options for streaming agent execution
 */
export interface StreamAgentOptions {
  provider?: AIProvider
  model?: string
  systemPrompt: string
  taskPrompt: string
  tools?: Array<{
    name: string
    description: string
    input_schema: Record<string, unknown>
  }>
  maxTurns?: number
  context?: {
    workspaceId: string
    userId?: string
    executionType: 'test' | 'scheduled' | 'chat'
    executionId?: string
  }
  agentId?: string
  enableReasoning?: boolean
  reasoningBudgetTokens?: number
  signal?: AbortSignal
}

/**
 * State for the useAgentStream hook
 */
export interface AgentStreamState {
  isStreaming: boolean
  text: string
  reasoning: string
  toolCalls: Array<{
    id: string
    name: string
    input: Record<string, unknown>
    result?: unknown
    status: 'pending' | 'executing' | 'completed' | 'error'
  }>
  todos: Array<{
    content: string
    status: 'pending' | 'in_progress' | 'completed'
    activeForm: string
  }>
  usage: {
    inputTokens: number
    outputTokens: number
    totalCost?: number
  } | null
  error: string | null
}

/**
 * Options for starting a stream via the hook
 */
export interface StartStreamOptions {
  enableReasoning?: boolean
  reasoningBudgetTokens?: number
}

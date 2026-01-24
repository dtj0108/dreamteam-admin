// Agent Runtime - Executes agents using AI SDK with Anthropic provider
// This module provides a multi-turn agent runtime that can execute tasks,
// track todos, and handle tool calls.

import { generateText, streamText, tool, CoreMessage } from 'ai'
import {
  anthropic,
  getModelPricing,
  getModelInstance,
  resolveModelName,
  CACHE_WRITE_MULTIPLIER,
  CACHE_READ_MULTIPLIER,
  PROVIDER_FEATURES,
} from './ai-sdk-provider'
import { toolSchemaToZod } from './schema-converter'
import { generateAgentSDKConfig, estimateToolTokens } from './agent-sdk'
import { createAdminClient } from './supabase/admin'
import { executeToolViaMCP } from './mcp-client'
import { sendScheduledTaskNotification } from './agent-messaging'
import { memorize } from './memory-service'
import { buildMemoryTools, injectMemoryContext } from './memory-tools'
import type { AgentWithRelations, SDKTool, ToolExecutionContext, AIProvider } from '@/types/agents'
import type { StreamEvent, StreamAgentOptions } from '@/types/streaming'
import type { MemoryContext } from '@/types/memory'
import { z } from 'zod'

// Maximum characters for tool result content sent to the model
const MAX_TOOL_RESULT_CHARS = 2000

// Default limits for data-heavy tools to reduce token usage
// These defaults are injected when the agent doesn't specify them
const TOOL_DEFAULT_LIMITS: Record<string, Record<string, unknown>> = {
  project_list: { limit: 10, status: 'active' },
  task_list: { limit: 20 },
  task_get_overdue: { limit: 20 },
  milestone_list: { limit: 20 },
  user_list: { limit: 20 },
  comment_list: { limit: 10 },
}

// HARD CAPS - agent cannot exceed these limits even if explicitly set
const TOOL_MAX_LIMITS: Record<string, Record<string, number>> = {
  project_list: { limit: 10 },
  task_list: { limit: 20 },
  task_get_overdue: { limit: 20 },
  milestone_list: { limit: 20 },
  user_list: { limit: 20 },
  comment_list: { limit: 10 },
}

/**
 * Enforce hard limits on tool parameters.
 * 1. Inject defaults for missing parameters
 * 2. Cap any limit values that exceed maximums
 */
function enforceToolLimits(
  toolName: string,
  toolInput: Record<string, unknown>
): Record<string, unknown> {
  const defaults = TOOL_DEFAULT_LIMITS[toolName]
  const maxLimits = TOOL_MAX_LIMITS[toolName]

  if (!defaults && !maxLimits) return toolInput

  // Start with defaults, then apply user input
  const result = { ...defaults, ...toolInput }

  // Enforce hard caps on limit values
  if (maxLimits) {
    for (const [key, maxValue] of Object.entries(maxLimits)) {
      const currentValue = result[key]
      if (typeof currentValue === 'number' && currentValue > maxValue) {
        console.log(`[enforceToolLimits] Capped ${toolName}.${key}: ${currentValue} → ${maxValue}`)
        result[key] = maxValue
      }
    }
  }

  return result
}

/**
 * Generate a cache key for tool call deduplication within a single agent run.
 * Uses sorted keys to ensure consistent ordering regardless of input object property order.
 */
function getToolCallCacheKey(toolName: string, input: Record<string, unknown>): string {
  return `${toolName}:${JSON.stringify(input, Object.keys(input).sort())}`
}

/**
 * Truncate tool results to prevent token explosion in multi-turn conversations.
 * Arrays are limited to first N items, strings are truncated, objects are summarized.
 */
function truncateToolResult(result: unknown): unknown {
  if (result === null || result === undefined) return result

  const str = JSON.stringify(result)
  if (str.length <= MAX_TOOL_RESULT_CHARS) return result

  // Handle arrays - keep first items + count
  if (Array.isArray(result)) {
    const itemSize = Math.ceil(str.length / result.length)
    const maxItems = Math.max(5, Math.floor(MAX_TOOL_RESULT_CHARS / itemSize))
    const truncated = result.slice(0, maxItems)
    if (result.length > maxItems) {
      return {
        items: truncated,
        _truncated: true,
        _totalCount: result.length,
        _shownCount: maxItems,
        _message: `Showing ${maxItems} of ${result.length} items. Use more specific filters to narrow results.`
      }
    }
    return truncated
  }

  // Handle objects with data arrays
  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>
    if (obj.data && Array.isArray(obj.data)) {
      return {
        ...obj,
        data: truncateToolResult(obj.data)
      }
    }
  }

  // Fallback: stringify and truncate
  return {
    _truncated: true,
    _preview: str.slice(0, MAX_TOOL_RESULT_CHARS),
    _message: `Result truncated from ${str.length} chars. Use more specific queries.`
  }
}


// Todo item for tracking agent progress
export interface AgentTodo {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm: string
}

// Cost breakdown for token usage
export interface TokenCost {
  inputCost: number
  outputCost: number
  cacheWriteCost: number
  cacheReadCost: number
  totalCost: number
  savingsFromCache: number
}

// Result of an agent run
export interface AgentRunResult {
  success: boolean
  result: string
  todos: AgentTodo[]
  toolCalls: ToolCallRecord[]
  usage: {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens?: number
    cacheReadTokens?: number
    cost?: TokenCost
  }
  error?: string
}

// Record of a tool call
export interface ToolCallRecord {
  name: string
  input: Record<string, unknown>
  output: unknown
  timestamp: string
}

// Context for agent execution (user/workspace info)
export interface AgentContext {
  userId: string
  userName?: string
  userEmail?: string
  workspaceId: string
  workspaceName?: string
}

// Provider-specific configuration
export interface ProviderConfig {
  // xAI specific - controls reasoning effort for Grok models
  reasoningEffort?: 'low' | 'medium' | 'high'
}

// Options for running an agent
export interface RunAgentOptions {
  provider?: AIProvider
  model?: string
  systemPrompt: string
  taskPrompt: string
  tools?: SDKTool[]
  maxTurns?: number
  context?: ToolExecutionContext
  agentId?: string // For memory system - associates memories with this agent
  providerConfig?: ProviderConfig
  enableMemory?: boolean // Enable memory injection and storage (default: true when context has workspaceId)
  onTodoUpdate?: (todos: AgentTodo[]) => void
  onToolCall?: (toolCall: ToolCallRecord) => void
  onMessage?: (role: 'user' | 'assistant', content: string) => void
}

/**
 * Calculate cost breakdown for token usage with caching
 */
function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0
): TokenCost {
  // Get model pricing from ai-sdk-provider
  const pricing = getModelPricing(model)

  // Calculate costs (prices are per 1M tokens)
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const cacheWriteCost = (cacheCreationTokens / 1_000_000) * pricing.input * CACHE_WRITE_MULTIPLIER
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.input * CACHE_READ_MULTIPLIER

  // Total cost with caching
  const totalCost = inputCost + outputCost + cacheWriteCost + cacheReadCost

  // What it would have cost without caching (cache reads would be regular input tokens)
  const costWithoutCaching = ((inputTokens + cacheReadTokens) / 1_000_000) * pricing.input + outputCost
  const savingsFromCache = Math.max(0, costWithoutCaching - totalCost)

  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    cacheWriteCost: Number(cacheWriteCost.toFixed(6)),
    cacheReadCost: Number(cacheReadCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
    savingsFromCache: Number(savingsFromCache.toFixed(6)),
  }
}

// Zod schema for TodoWrite tool
const todoSchema = z.object({
  todos: z.array(z.object({
    content: z.string().describe('The task description'),
    status: z.enum(['pending', 'in_progress', 'completed']),
    activeForm: z.string().describe('Present continuous form of the task'),
  })).describe('The updated todo list'),
})

/**
 * Build AI SDK tools from SDK tool definitions
 * Converts JSON Schema to Zod and wraps execute functions with limit enforcement
 */
function buildToolsForAISDK(
  sdkTools: SDKTool[],
  context: ToolExecutionContext,
  toolCallCache: Map<string, unknown>,
  onToolCall?: (toolCall: ToolCallRecord) => void,
  onTodoUpdate?: (todos: AgentTodo[]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {}

  // Add TodoWrite tool
  tools['TodoWrite'] = tool({
    description: 'Track and update task progress. Use this to plan tasks and mark them as completed.',
    parameters: todoSchema,
    execute: async ({ todos }) => {
      onTodoUpdate?.(todos as AgentTodo[])
      const result = { success: true, message: 'Todos updated successfully' }
      onToolCall?.({
        name: 'TodoWrite',
        input: { todos },
        output: result,
        timestamp: new Date().toISOString(),
      })
      return result
    },
  })

  // Add MCP tools
  for (const sdkTool of sdkTools) {
    tools[sdkTool.name] = tool({
      description: sdkTool.description,
      parameters: toolSchemaToZod(sdkTool.input_schema),
      execute: async (args) => {
        const toolInput = args as Record<string, unknown>

        // Enforce limits on expensive tools
        const processedInput = enforceToolLimits(sdkTool.name, toolInput)
        const cacheKey = getToolCallCacheKey(sdkTool.name, processedInput)

        // Check for duplicate call within this execution
        if (toolCallCache.has(cacheKey)) {
          console.log(`[runAgent] Returning cached result for: ${sdkTool.name}`)
          const cachedResult = toolCallCache.get(cacheKey)
          const result = { ...(cachedResult as Record<string, unknown>), _cached: true }
          onToolCall?.({
            name: sdkTool.name,
            input: toolInput,
            output: result,
            timestamp: new Date().toISOString(),
          })
          return result
        }

        // Execute via MCP server
        const mcpResult = await executeToolViaMCP({
          toolName: sdkTool.name,
          toolInput: processedInput,
          workspaceId: context.workspaceId,
          userId: context.userId,
        })

        const limitsEnforced = TOOL_DEFAULT_LIMITS[sdkTool.name] !== undefined || TOOL_MAX_LIMITS[sdkTool.name] !== undefined
        console.log('MCP Tool Call:', {
          toolName: sdkTool.name,
          workspaceId: context.workspaceId,
          executionType: context.executionType,
          limitsEnforced,
          success: mcpResult.success,
          latencyMs: mcpResult.latencyMs,
        })

        const result = mcpResult.success
          ? { success: true, data: mcpResult.result }
          : { success: false, error: mcpResult.error }

        // Cache the result for deduplication
        toolCallCache.set(cacheKey, result)

        // Truncate large results
        const truncatedResult = truncateToolResult(result)

        onToolCall?.({
          name: sdkTool.name,
          input: toolInput,
          output: truncatedResult,
          timestamp: new Date().toISOString(),
        })

        return truncatedResult
      },
    })
  }

  return tools
}


/**
 * Run an agent with the given configuration using AI SDK
 */
export async function runAgent(options: RunAgentOptions): Promise<AgentRunResult> {
  const {
    provider = 'anthropic',
    model = 'claude-sonnet-4-5-20250929',
    systemPrompt,
    taskPrompt,
    tools: sdkTools = [],
    maxTurns = 10,
    agentId,
    providerConfig,
    enableMemory = true,
    onTodoUpdate,
    onToolCall,
    onMessage,
  } = options

  // Resolve the model ID for the provider
  const modelId = resolveModelName(model, provider)
  const features = PROVIDER_FEATURES[provider]

  // Track tool calls and todos
  const toolCalls: ToolCallRecord[] = []
  const toolCallCache = new Map<string, unknown>()
  let currentTodos: AgentTodo[] = []

  // Track todos via closure
  const trackTodoUpdate = (todos: AgentTodo[]) => {
    currentTodos = todos
    onTodoUpdate?.(todos)
  }

  // Track tool calls via closure
  const trackToolCall = (record: ToolCallRecord) => {
    toolCalls.push(record)
    onToolCall?.(record)
  }

  // Build AI SDK tools with execution handlers
  const aiTools = buildToolsForAISDK(
    sdkTools,
    options.context || { workspaceId: '', executionType: 'test' },
    toolCallCache,
    trackToolCall,
    trackTodoUpdate
  )

  // Build memory context if workspace is available
  const memoryContext: MemoryContext | null = (enableMemory && options.context?.workspaceId)
    ? {
        workspaceId: options.context.workspaceId,
        userId: options.context.userId,
        agentId: agentId
      }
    : null

  // Add memory tools if memory is enabled
  if (memoryContext) {
    const memoryTools = buildMemoryTools(memoryContext)
    Object.assign(aiTools, memoryTools)
  }

  // Inject memory context into system prompt
  let finalSystemPrompt = systemPrompt
  if (memoryContext) {
    try {
      finalSystemPrompt = await injectMemoryContext(systemPrompt, taskPrompt, memoryContext)
    } catch (error) {
      console.error('Failed to inject memory context:', error)
      // Continue without memory injection
    }
  }

  onMessage?.('user', taskPrompt)

  try {
    // Build provider-specific options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providerSpecificOptions: Record<string, any> = {}

    if (provider === 'anthropic' && features.supportsCaching) {
      // Anthropic-specific: enable caching
      providerSpecificOptions.experimental_providerMetadata = {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        },
      }
    } else if (provider === 'xai' && providerConfig?.reasoningEffort) {
      // xAI-specific: reasoning effort setting
      providerSpecificOptions.providerOptions = {
        xai: { reasoningEffort: providerConfig.reasoningEffort },
      }
    }

    // Use AI SDK generateText with automatic tool loop
    const result = await generateText({
      model: getModelInstance(provider, modelId),
      system: finalSystemPrompt,
      prompt: taskPrompt,
      tools: aiTools,
      maxSteps: maxTurns,
      ...providerSpecificOptions,
    })

    // Extract text content
    const finalResult = result.text || ''
    if (finalResult) {
      onMessage?.('assistant', finalResult)
    }

    // Extract usage metrics
    const usage = result.usage || { promptTokens: 0, completionTokens: 0 }

    // Cache metrics are only available for Anthropic
    let cacheCreationTokens = 0
    let cacheReadTokens = 0
    if (provider === 'anthropic') {
      const providerMetadata = result.experimental_providerMetadata?.anthropic as {
        cacheCreationInputTokens?: number
        cacheReadInputTokens?: number
      } | undefined
      cacheCreationTokens = providerMetadata?.cacheCreationInputTokens || 0
      cacheReadTokens = providerMetadata?.cacheReadInputTokens || 0
    }

    // Log usage metrics for monitoring
    console.log('Agent run completed:', {
      provider,
      model: modelId,
      steps: result.steps?.length || 1,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      ...(provider === 'anthropic' && { cacheCreationTokens, cacheReadTokens }),
      toolCallsCount: toolCalls.length,
    })

    // Store episode for memory extraction (async, non-blocking)
    if (memoryContext) {
      memorize('conversation', {
        taskPrompt,
        result: finalResult,
        model: modelId,
        provider,
        toolCalls: toolCalls.map(tc => ({
          name: tc.name,
          input: tc.input,
          // Don't store full output to save space
          success: tc.output && typeof tc.output === 'object' && 'success' in tc.output
            ? (tc.output as { success?: boolean }).success ?? true
            : true
        })),
        usage: {
          inputTokens: usage.promptTokens,
          outputTokens: usage.completionTokens
        }
      }, memoryContext).catch(error => {
        console.error('Failed to store memory episode:', error)
      })
    }

    return {
      success: true,
      result: finalResult,
      todos: currentTodos,
      toolCalls,
      usage: {
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        cacheCreationTokens,
        cacheReadTokens,
        cost: calculateTokenCost(
          modelId,
          usage.promptTokens,
          usage.completionTokens,
          cacheCreationTokens,
          cacheReadTokens
        ),
      },
    }
  } catch (error) {
    console.error('Agent run error:', error)
    return {
      success: false,
      result: '',
      todos: currentTodos,
      toolCalls,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Stream an agent execution with real-time event delivery
 * Supports extended thinking (reasoning) for Anthropic models
 *
 * @param options - Configuration for streaming agent execution
 * @yields StreamEvent objects for text, reasoning, tool calls, and completion
 */
export async function* streamAgent(options: StreamAgentOptions): AsyncGenerator<StreamEvent> {
  const {
    provider = 'anthropic',
    model = 'claude-sonnet-4-5-20250929',
    systemPrompt,
    taskPrompt,
    tools: sdkTools = [],
    maxTurns = 10,
    agentId,
    enableReasoning = false,
    reasoningBudgetTokens = 10000,
    signal,
  } = options

  // Resolve the model ID for the provider
  const modelId = resolveModelName(model, provider)
  const features = PROVIDER_FEATURES[provider]

  // Track tool calls and todos
  const toolCalls: ToolCallRecord[] = []
  const toolCallCache = new Map<string, unknown>()
  let currentTodos: AgentTodo[] = []

  const now = () => new Date().toISOString()

  // Track todos via closure
  const trackTodoUpdate = (todos: AgentTodo[]) => {
    currentTodos = todos
  }

  // Track tool calls via closure
  const trackToolCall = (record: ToolCallRecord) => {
    toolCalls.push(record)
  }

  // Build AI SDK tools with execution handlers
  const aiTools = buildToolsForAISDK(
    sdkTools,
    options.context || { workspaceId: '', executionType: 'test' },
    toolCallCache,
    trackToolCall,
    trackTodoUpdate
  )

  // Build memory context if workspace is available
  const memoryContext: MemoryContext | null = (options.context?.workspaceId)
    ? {
        workspaceId: options.context.workspaceId,
        userId: options.context.userId,
        agentId: agentId
      }
    : null

  // Add memory tools if memory is enabled
  if (memoryContext) {
    const memoryTools = buildMemoryTools(memoryContext)
    Object.assign(aiTools, memoryTools)
  }

  // Inject memory context into system prompt
  let finalSystemPrompt = systemPrompt
  if (memoryContext) {
    try {
      finalSystemPrompt = await injectMemoryContext(systemPrompt, taskPrompt, memoryContext)
    } catch (error) {
      console.error('Failed to inject memory context:', error)
    }
  }

  try {
    // Build provider-specific options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providerSpecificOptions: Record<string, any> = {}

    // Enable extended thinking for Anthropic when requested
    if (enableReasoning && provider === 'anthropic') {
      providerSpecificOptions.providerOptions = {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: reasoningBudgetTokens
          }
        }
      }
    } else if (provider === 'anthropic' && features.supportsCaching) {
      // Anthropic-specific: enable caching when not using reasoning
      providerSpecificOptions.experimental_providerMetadata = {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        },
      }
    }

    // Use AI SDK streamText for streaming response
    const result = streamText({
      model: getModelInstance(provider, modelId),
      system: finalSystemPrompt,
      prompt: taskPrompt,
      tools: aiTools,
      maxSteps: maxTurns,
      abortSignal: signal,
      ...providerSpecificOptions,
    })

    let fullText = ''

    // Iterate fullStream for all event types
    for await (const part of result.fullStream) {
      // Check for abort signal
      if (signal?.aborted) {
        yield {
          type: 'error',
          error: 'Stream aborted by client',
          timestamp: now()
        }
        break
      }

      switch (part.type) {
        case 'text-delta':
          fullText += part.textDelta
          yield {
            type: 'text_delta',
            content: part.textDelta,
            timestamp: now()
          }
          break

        case 'reasoning':
          yield {
            type: 'reasoning_delta',
            content: part.textDelta,
            timestamp: now()
          }
          break

        case 'tool-call':
          yield {
            type: 'tool_call_start',
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            timestamp: now()
          }
          yield {
            type: 'tool_call_end',
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            input: part.args as Record<string, unknown>,
            timestamp: now()
          }
          break

        case 'tool-result':
          // Check if this is a TodoWrite call
          if (part.toolName === 'TodoWrite') {
            yield {
              type: 'todo_update',
              todos: currentTodos,
              timestamp: now()
            }
          }
          yield {
            type: 'tool_result',
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            result: part.result,
            success: true,
            timestamp: now()
          }
          break

        case 'error':
          yield {
            type: 'error',
            error: part.error instanceof Error ? part.error.message : 'Unknown error',
            timestamp: now()
          }
          break
      }
    }

    // Get final usage from the result
    const usage = await result.usage
    const finalText = await result.text

    // Calculate cost
    let cacheCreationTokens = 0
    let cacheReadTokens = 0
    if (provider === 'anthropic') {
      const providerMetadata = (await result.experimental_providerMetadata)?.anthropic as {
        cacheCreationInputTokens?: number
        cacheReadInputTokens?: number
      } | undefined
      cacheCreationTokens = providerMetadata?.cacheCreationInputTokens || 0
      cacheReadTokens = providerMetadata?.cacheReadInputTokens || 0
    }

    const cost = calculateTokenCost(
      modelId,
      usage?.promptTokens || 0,
      usage?.completionTokens || 0,
      cacheCreationTokens,
      cacheReadTokens
    )

    // Yield final done event
    yield {
      type: 'done',
      result: finalText || fullText,
      usage: {
        inputTokens: usage?.promptTokens || 0,
        outputTokens: usage?.completionTokens || 0,
        cacheCreationTokens,
        cacheReadTokens,
        totalCost: cost.totalCost
      },
      timestamp: now()
    }

    // Log usage metrics for monitoring
    console.log('Agent stream completed:', {
      provider,
      model: modelId,
      inputTokens: usage?.promptTokens,
      outputTokens: usage?.completionTokens,
      toolCallsCount: toolCalls.length,
      enableReasoning,
    })

  } catch (error) {
    console.error('Agent stream error:', error)
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: now()
    }
  }
}

/**
 * Run an agent by ID with the given task prompt
 */
export async function runAgentById(
  agentId: string,
  taskPrompt: string,
  options?: {
    maxTurns?: number
    context?: ToolExecutionContext
    providerConfig?: ProviderConfig
    onTodoUpdate?: (todos: AgentTodo[]) => void
    onToolCall?: (toolCall: ToolCallRecord) => void
    onMessage?: (role: 'user' | 'assistant', content: string) => void
  }
): Promise<AgentRunResult> {
  const supabase = createAdminClient()

  // Fetch agent with all relations
  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select(`
      *,
      tools:ai_agent_tools(
        tool_id,
        config,
        tool:agent_tools(*)
      ),
      skills:ai_agent_skills(
        skill_id,
        skill:agent_skills(*)
      ),
      mind:agent_mind_assignments(
        mind_id,
        position_override,
        mind:agent_mind(*)
      ),
      delegations:agent_delegations!from_agent_id(
        *,
        to_agent:ai_agents!agent_delegations_to_agent_id_fkey(id, name, avatar_url)
      ),
      rules:agent_rules(*),
      prompt_sections:agent_prompt_sections(*)
    `)
    .eq('id', agentId)
    .single()

  if (error || !agent) {
    return {
      success: false,
      result: '',
      todos: [],
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      error: error?.message || 'Agent not found',
    }
  }

  // Generate SDK config
  const sdkConfig = generateAgentSDKConfig(agent as AgentWithRelations)

  // Get provider from agent (defaults to anthropic if not set)
  const provider: AIProvider = (agent.provider as AIProvider) || 'anthropic'

  // Run the agent with agentId for memory system
  return runAgent({
    provider,
    model: sdkConfig.model,
    systemPrompt: sdkConfig.systemPrompt,
    taskPrompt,
    tools: sdkConfig.tools,
    maxTurns: options?.maxTurns ?? sdkConfig.maxTurns,
    context: options?.context,
    agentId: agentId,
    providerConfig: options?.providerConfig,
    onTodoUpdate: options?.onTodoUpdate,
    onToolCall: options?.onToolCall,
    onMessage: options?.onMessage,
  })
}

// Context for scheduled execution (workspace info)
export interface ScheduledExecutionContext {
  workspaceId: string
  workspaceName?: string
}

/**
 * Run an agent for a scheduled execution
 */
export async function runScheduledExecution(
  executionId: string,
  agentId: string,
  taskPrompt: string,
  context?: ScheduledExecutionContext
): Promise<AgentRunResult> {
  const supabase = createAdminClient()
  const startTime = Date.now()

  // Fetch execution with schedule data for notifications
  const { data: execution } = await supabase
    .from('agent_schedule_executions')
    .select(`
      *,
      schedule:agent_schedules(id, name, task_prompt, created_by, workspace_id)
    `)
    .eq('id', executionId)
    .single()

  const schedule = execution?.schedule as {
    id: string
    name: string
    task_prompt: string
    created_by: string | null
    workspace_id: string | null
  } | null

  // Update execution to running
  await supabase
    .from('agent_schedule_executions')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', executionId)

  try {
    // Build task prompt with context if provided
    let finalTaskPrompt = taskPrompt
    const workspaceId = context?.workspaceId || schedule?.workspace_id || ''

    if (workspaceId) {
      const contextSection = `## Current Context
- Workspace ID: ${workspaceId}${context?.workspaceName ? `\n- Workspace Name: ${context.workspaceName}` : ''}

You have access to data within this workspace. Use this workspace ID when making tool calls that require it.

---

`
      finalTaskPrompt = contextSection + taskPrompt
    }

    // Run the agent with context
    const result = await runAgentById(agentId, finalTaskPrompt, {
      context: {
        workspaceId,
        executionType: 'scheduled',
        executionId: executionId,
      },
    })
    const duration = Date.now() - startTime

    // Update execution with results
    await supabase
      .from('agent_schedule_executions')
      .update({
        status: result.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        result: {
          message: result.result,
          todos: result.todos,
        },
        tool_calls: result.toolCalls,
        tokens_input: result.usage.inputTokens,
        tokens_output: result.usage.outputTokens,
        error_message: result.error || null,
        duration_ms: duration,
      })
      .eq('id', executionId)

    // Send completion notification
    if (schedule && workspaceId) {
      try {
        await sendScheduledTaskNotification({
          executionId,
          aiAgentId: agentId,
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          taskPrompt: schedule.task_prompt,
          status: result.success ? 'completed' : 'failed',
          resultText: result.success ? result.result : (result.error || 'Unknown error'),
          durationMs: duration,
          workspaceId,
          scheduleCreatedBy: schedule.created_by,
          supabase,
        })
      } catch (notifyError) {
        console.error('[runScheduledExecution] Failed to send notification:', notifyError)
        // Don't fail the execution if notification fails
      }
    }

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    // Update execution with error
    await supabase
      .from('agent_schedule_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
      })
      .eq('id', executionId)

    // Send failure notification
    const workspaceId = context?.workspaceId || schedule?.workspace_id || ''
    if (schedule && workspaceId) {
      try {
        await sendScheduledTaskNotification({
          executionId,
          aiAgentId: agentId,
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          taskPrompt: schedule.task_prompt,
          status: 'failed',
          resultText: error instanceof Error ? error.message : 'Unknown error',
          durationMs: duration,
          workspaceId,
          scheduleCreatedBy: schedule.created_by,
          supabase,
        })
      } catch (notifyError) {
        console.error('[runScheduledExecution] Failed to send failure notification:', notifyError)
        // Don't mask the original error
      }
    }

    throw error
  }
}

/**
 * Run an agent for a chat message (team chat)
 */
export async function runAgentForChat(
  agentId: string,
  channelId: string,
  userMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: AgentContext
): Promise<{
  response: string
  usage: { inputTokens: number; outputTokens: number }
}> {
  const supabase = createAdminClient()

  // Fetch agent config
  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select(`
      *,
      tools:ai_agent_tools(
        tool_id,
        config,
        tool:agent_tools(*)
      ),
      skills:ai_agent_skills(
        skill_id,
        skill:agent_skills(*)
      ),
      mind:agent_mind_assignments(
        mind_id,
        position_override,
        mind:agent_mind(*)
      ),
      rules:agent_rules(*),
      prompt_sections:agent_prompt_sections(*)
    `)
    .eq('id', agentId)
    .single()

  if (error || !agent) {
    throw new Error(error?.message || 'Agent not found')
  }

  // Generate SDK config
  const sdkConfig = generateAgentSDKConfig(agent as AgentWithRelations)

  // Get provider from agent config (default to anthropic for backward compatibility)
  const provider: AIProvider = agent.provider || 'anthropic'

  // Log token breakdown for monitoring
  const toolTokenEstimate = estimateToolTokens(sdkConfig.tools)
  const systemPromptTokenEstimate = Math.ceil(sdkConfig.systemPrompt.length / 4)
  console.log('Agent token breakdown:', {
    agentId,
    agentName: agent.name,
    provider,
    model: sdkConfig.model,
    systemPromptChars: sdkConfig.systemPrompt.length,
    estimatedSystemTokens: systemPromptTokenEstimate,
    toolCount: sdkConfig.tools.length,
    estimatedToolTokens: toolTokenEstimate,
    estimatedTotalBaseTokens: systemPromptTokenEstimate + toolTokenEstimate,
  })

  // Inject context into system prompt
  let systemPrompt = sdkConfig.systemPrompt
  if (context) {
    const contextSection = `## Current Context
- Workspace ID: ${context.workspaceId}${context.workspaceName ? `\n- Workspace Name: ${context.workspaceName}` : ''}
- User ID: ${context.userId}${context.userName ? `\n- User Name: ${context.userName}` : ''}

You have access to this user's data within this workspace. Do NOT ask the user for their workspace ID or user ID - use the values provided above.
`
    systemPrompt = contextSection + '\n\n' + systemPrompt
  }

  // Build memory context for chat
  const memoryContext: MemoryContext | null = context?.workspaceId
    ? {
        workspaceId: context.workspaceId,
        userId: context.userId,
        agentId: agentId
      }
    : null

  // Inject memory context into system prompt
  if (memoryContext) {
    try {
      systemPrompt = await injectMemoryContext(systemPrompt, userMessage, memoryContext)
    } catch (error) {
      console.error('Failed to inject memory context for chat:', error)
      // Continue without memory injection
    }
  }

  // Build messages with conversation history for AI SDK
  const messages: CoreMessage[] = []

  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  messages.push({ role: 'user', content: userMessage })

  // Make API call using AI SDK (single turn for chat)
  const result = await generateText({
    model: getModelInstance(provider, sdkConfig.model),
    system: systemPrompt,
    messages,
  })

  // Store chat episode for memory extraction (async, non-blocking)
  if (memoryContext) {
    memorize('conversation', {
      channelId,
      userMessage,
      response: result.text,
      conversationHistoryLength: conversationHistory?.length || 0,
      model: sdkConfig.model,
      provider
    }, memoryContext).catch(error => {
      console.error('Failed to store chat memory episode:', error)
    })
  }

  return {
    response: result.text,
    usage: {
      inputTokens: result.usage?.promptTokens || 0,
      outputTokens: result.usage?.completionTokens || 0,
    },
  }
}

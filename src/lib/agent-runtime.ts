// Agent Runtime - Executes agents using the Anthropic API
// This module provides a multi-turn agent runtime that can execute tasks,
// track todos, and handle tool calls.

import Anthropic from '@anthropic-ai/sdk'
import { generateAgentSDKConfig } from './agent-sdk'
import { createAdminClient } from './supabase/admin'
import type { AgentWithRelations, AgentSDKConfig, SDKTool } from '@/types/agents'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Todo item for tracking agent progress
export interface AgentTodo {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm: string
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

// Options for running an agent
export interface RunAgentOptions {
  systemPrompt: string
  taskPrompt: string
  tools?: SDKTool[]
  maxTurns?: number
  onTodoUpdate?: (todos: AgentTodo[]) => void
  onToolCall?: (toolCall: ToolCallRecord) => void
  onMessage?: (role: 'user' | 'assistant', content: string) => void
}

// Built-in TodoWrite tool definition
const TODO_WRITE_TOOL: Anthropic.Tool = {
  name: 'TodoWrite',
  description: 'Track and update task progress. Use this to plan tasks and mark them as completed.',
  input_schema: {
    type: 'object' as const,
    properties: {
      todos: {
        type: 'array',
        description: 'The updated todo list',
        items: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The task description' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            activeForm: { type: 'string', description: 'Present continuous form of the task' },
          },
          required: ['content', 'status', 'activeForm'],
        },
      },
    },
    required: ['todos'],
  },
}

// Convert SDK tools to Anthropic format
function toAnthropicTools(sdkTools: SDKTool[]): Anthropic.Tool[] {
  return sdkTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object' as const,
      properties: (tool.input_schema.properties || {}) as Record<string, unknown>,
      required: (Array.isArray(tool.input_schema.required)
        ? tool.input_schema.required
        : []) as string[],
    },
  }))
}

// Handle a tool call and return the result
async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  currentTodos: AgentTodo[],
  onTodoUpdate?: (todos: AgentTodo[]) => void
): Promise<{ result: unknown; updatedTodos: AgentTodo[] }> {
  // Handle TodoWrite specially
  if (toolName === 'TodoWrite') {
    const newTodos = (toolInput.todos as AgentTodo[]) || []
    onTodoUpdate?.(newTodos)
    return {
      result: { success: true, message: 'Todos updated successfully' },
      updatedTodos: newTodos,
    }
  }

  // For other tools, we simulate/mock the response
  // In a full implementation, this would call actual tool handlers
  return {
    result: {
      success: true,
      message: `Tool ${toolName} executed (simulated)`,
      input: toolInput
    },
    updatedTodos: currentTodos,
  }
}

/**
 * Run an agent with the given configuration
 */
export async function runAgent(options: RunAgentOptions): Promise<AgentRunResult> {
  const {
    systemPrompt,
    taskPrompt,
    tools = [],
    maxTurns = 10,
    onTodoUpdate,
    onToolCall,
    onMessage,
  } = options

  // Prepare tools - always include TodoWrite
  const allTools: Anthropic.Tool[] = [
    TODO_WRITE_TOOL,
    ...toAnthropicTools(tools),
  ]

  // Initialize conversation
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: taskPrompt },
  ]

  let currentTodos: AgentTodo[] = []
  const toolCalls: ToolCallRecord[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let finalResult = ''

  onMessage?.('user', taskPrompt)

  try {
    for (let turn = 0; turn < maxTurns; turn++) {
      // Make API call
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools: allTools,
        messages,
      })

      // Track usage
      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      // Check if we're done (no tool use, or stop reason is end_turn)
      const hasToolUse = response.content.some(block => block.type === 'tool_use')

      // Extract text content
      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n')

      if (textContent) {
        finalResult = textContent
        onMessage?.('assistant', textContent)
      }

      // If no tool use, we're done
      if (!hasToolUse || response.stop_reason === 'end_turn') {
        return {
          success: true,
          result: finalResult,
          todos: currentTodos,
          toolCalls,
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
          },
        }
      }

      // Process tool calls
      const assistantMessage: Anthropic.MessageParam = {
        role: 'assistant',
        content: response.content,
      }
      messages.push(assistantMessage)

      // Handle each tool use
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const { result, updatedTodos } = await handleToolCall(
            block.name,
            block.input as Record<string, unknown>,
            currentTodos,
            onTodoUpdate
          )
          currentTodos = updatedTodos

          const toolCallRecord: ToolCallRecord = {
            name: block.name,
            input: block.input as Record<string, unknown>,
            output: result,
            timestamp: new Date().toISOString(),
          }
          toolCalls.push(toolCallRecord)
          onToolCall?.(toolCallRecord)

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        }
      }

      // Add tool results to conversation
      messages.push({
        role: 'user',
        content: toolResults,
      })
    }

    // Max turns reached
    return {
      success: true,
      result: finalResult || 'Max turns reached',
      todos: currentTodos,
      toolCalls,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
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
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
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
      tools:agent_tool_assignments(
        tool_id,
        config,
        tool:agent_tools(*)
      ),
      skills:agent_skill_assignments(
        skill_id,
        skill:agent_skills(*)
      ),
      mind:agent_mind_assignments(
        mind_id,
        position_override,
        mind:agent_mind(*)
      ),
      delegations:agent_delegations(
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

  // Run the agent
  return runAgent({
    systemPrompt: sdkConfig.systemPrompt,
    taskPrompt,
    tools: sdkConfig.tools,
    maxTurns: options?.maxTurns ?? sdkConfig.maxTurns,
    onTodoUpdate: options?.onTodoUpdate,
    onToolCall: options?.onToolCall,
    onMessage: options?.onMessage,
  })
}

/**
 * Run an agent for a scheduled execution
 */
export async function runScheduledExecution(
  executionId: string,
  agentId: string,
  taskPrompt: string
): Promise<AgentRunResult> {
  const supabase = createAdminClient()
  const startTime = Date.now()

  // Update execution to running
  await supabase
    .from('agent_schedule_executions')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', executionId)

  try {
    // Run the agent
    const result = await runAgentById(agentId, taskPrompt)
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
      tools:agent_tool_assignments(
        tool_id,
        config,
        tool:agent_tools(*)
      ),
      skills:agent_skill_assignments(
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

  // Build messages with conversation history
  const messages: Anthropic.MessageParam[] = []

  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  messages.push({ role: 'user', content: userMessage })

  // Make API call (single turn for chat)
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  })

  // Extract text content
  const textContent = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  return {
    response: textContent,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAgentSDKConfig } from '@/lib/agent-sdk'
import { streamAgent } from '@/lib/agent-runtime'
import { createSSEResponse } from '@/lib/sse'
import type { AIProvider } from '@/types/agents'

// POST /api/admin/agents/[id]/test/[sessionId]/stream - Stream agent response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id, sessionId } = await params

  let body: { content: string; enableReasoning?: boolean; reasoningBudgetTokens?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { content, enableReasoning = false, reasoningBudgetTokens = 10000 } = body

  if (!content || content.trim() === '') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from('agent_test_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('agent_id', id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Test session not found' }, { status: 404 })
  }

  if (session.status !== 'active') {
    return NextResponse.json({ error: 'Test session is not active' }, { status: 400 })
  }

  // Fetch agent with all relations
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select(`
      *,
      department:agent_departments(id, name, icon),
      tools:ai_agent_tools(
        tool_id,
        config,
        tool:agent_tools(id, name, description, category, input_schema, is_builtin)
      ),
      skills:ai_agent_skills(
        skill_id,
        skill:agent_skills(id, name, description, category, skill_content, triggers)
      ),
      rules:agent_rules(
        id, rule_type, rule_content, condition, priority, is_enabled
      ),
      prompt_sections:agent_prompt_sections(
        id, section_type, section_title, section_content, position, is_enabled
      )
    `)
    .eq('id', id)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Get provider from agent (default to anthropic for backward compatibility)
  const provider: AIProvider = (agent.provider as AIProvider) || 'anthropic'

  // Get previous messages for context
  const { data: previousMessages } = await supabase
    .from('agent_test_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('sequence_number', { ascending: true })

  // Get next sequence number
  const nextSequence = (previousMessages?.length || 0) + 1

  // Record user message
  const { error: userMsgError } = await supabase
    .from('agent_test_messages')
    .insert({
      session_id: sessionId,
      role: 'user',
      content,
      sequence_number: nextSequence
    })

  if (userMsgError) {
    console.error('Record user message error:', userMsgError)
    return NextResponse.json({ error: 'Failed to record message' }, { status: 500 })
  }

  // Generate SDK config
  const sdkConfig = generateAgentSDKConfig(agent)

  // Build conversation context for multi-turn
  // For now we just use the current message, but we could incorporate history
  const taskPrompt = content

  // Get test config for workspace context
  const testConfig = session.test_config as {
    tool_mode?: string
    workspace_id?: string
  }

  // Create the stream
  const stream = streamAgent({
    provider,
    model: sdkConfig.model,
    systemPrompt: sdkConfig.systemPrompt,
    taskPrompt,
    tools: sdkConfig.tools,
    maxTurns: 1, // Single turn for test sessions
    agentId: id,
    context: testConfig?.workspace_id
      ? {
          workspaceId: testConfig.workspace_id,
          executionType: 'test' as const,
        }
      : undefined,
    enableReasoning,
    reasoningBudgetTokens,
    signal: request.signal,
  })

  // Return SSE response
  return createSSEResponse(stream)
}

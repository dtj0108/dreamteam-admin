import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAgentSDKConfig } from '@/lib/agent-sdk'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/admin/agents/[id]/test/[sessionId]/message - Send message in test
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id, sessionId } = await params
  const body = await request.json()
  const { content } = body

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

  // Get previous messages for context
  const { data: previousMessages } = await supabase
    .from('agent_test_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('sequence_number', { ascending: true })

  // Get next sequence number
  const nextSequence = (previousMessages?.length || 0) + 1

  // Record user message
  const { data: userMessage, error: userMsgError } = await supabase
    .from('agent_test_messages')
    .insert({
      session_id: sessionId,
      role: 'user',
      content,
      sequence_number: nextSequence
    })
    .select()
    .single()

  if (userMsgError) {
    console.error('Record user message error:', userMsgError)
    return NextResponse.json({ error: 'Failed to record message' }, { status: 500 })
  }

  // Generate SDK config
  const sdkConfig = generateAgentSDKConfig(agent)

  // Build message history for Claude
  const messages: Anthropic.MessageParam[] = (previousMessages || [])
    .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
    .map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

  // Add current message
  messages.push({ role: 'user', content })

  // Call Claude API
  const startTime = Date.now()

  try {
    const anthropic = new Anthropic()

    // Convert tools to Claude format
    const tools: Anthropic.Tool[] = sdkConfig.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema
    }))

    const response = await anthropic.messages.create({
      model: sdkConfig.model,
      max_tokens: 4096,
      system: sdkConfig.systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined
    })

    const latency = Date.now() - startTime

    // Extract text content
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    // Extract tool use blocks
    const toolUseBlocks = response.content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')

    const assistantSequence = nextSequence + 1

    // Record assistant message
    const { data: assistantMessage } = await supabase
      .from('agent_test_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: textContent || '(No text response)',
        latency_ms: latency,
        tokens_input: response.usage.input_tokens,
        tokens_output: response.usage.output_tokens,
        sequence_number: assistantSequence
      })
      .select()
      .single()

    // Record tool calls if any
    const toolMessages = []
    let toolSequence = assistantSequence + 1

    for (const toolUse of toolUseBlocks) {
      const { data: toolMessage } = await supabase
        .from('agent_test_messages')
        .insert({
          session_id: sessionId,
          role: 'tool_use',
          content: `Called ${toolUse.name}`,
          tool_name: toolUse.name,
          tool_input: toolUse.input as Record<string, unknown>,
          tool_use_id: toolUse.id,
          sequence_number: toolSequence
        })
        .select()
        .single()

      if (toolMessage) {
        toolMessages.push(toolMessage)
      }
      toolSequence++

      // For mock mode, record a mock response
      const testConfig = session.test_config as { tool_mode?: string; mock_responses?: Record<string, unknown> }
      if (testConfig?.tool_mode === 'mock') {
        const mockResponse = testConfig.mock_responses?.[toolUse.name] || { success: true, message: 'Mock response' }

        await supabase
          .from('agent_test_messages')
          .insert({
            session_id: sessionId,
            role: 'tool_result',
            content: JSON.stringify(mockResponse),
            tool_name: toolUse.name,
            tool_output: mockResponse as Record<string, unknown>,
            tool_use_id: toolUse.id,
            sequence_number: toolSequence
          })

        toolSequence++
      }
    }

    // Update session stats
    await supabase
      .from('agent_test_sessions')
      .update({
        total_turns: session.total_turns + 1,
        total_tokens: (session.total_tokens || 0) + response.usage.input_tokens + response.usage.output_tokens
      })
      .eq('id', sessionId)

    return NextResponse.json({
      userMessage,
      assistantMessage,
      toolCalls: toolMessages,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        latency_ms: latency
      }
    })
  } catch (apiError) {
    console.error('Claude API error:', apiError)

    // Record error as assistant message
    await supabase
      .from('agent_test_messages')
      .insert({
        session_id: sessionId,
        role: 'system',
        content: `Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`,
        sequence_number: nextSequence + 1
      })

    return NextResponse.json(
      { error: 'Failed to get response from Claude' },
      { status: 500 }
    )
  }
}

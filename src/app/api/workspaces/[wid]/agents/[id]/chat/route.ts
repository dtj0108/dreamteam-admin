import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceMember } from '@/lib/workspace-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAgentForChat } from '@/lib/agent-runtime'

// POST /api/workspaces/[wid]/agents/[id]/chat - Chat with an agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wid: string; id: string }> }
) {
  const { wid: workspaceId, id: agentId } = await params
  const { error, user } = await requireWorkspaceMember(workspaceId)
  if (error) return error

  const body = await request.json()
  const { message, conversationHistory } = body

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get user profile for name
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  // Verify agent exists and is accessible
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('id, name, is_system, workspace_id')
    .eq('id', agentId)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Agent must be system or belong to workspace
  if (!agent.is_system && agent.workspace_id !== workspaceId) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Get workspace name
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single()

  try {
    const result = await runAgentForChat(
      agentId,
      `workspace-${workspaceId}`, // Use workspace as channel
      message,
      conversationHistory,
      {
        userId: user!.id,
        userName: userProfile?.full_name || undefined,
        userEmail: user!.email || undefined,
        workspaceId,
        workspaceName: workspace?.name || undefined,
      }
    )

    return NextResponse.json({
      response: result.response,
      usage: result.usage,
    })
  } catch (err) {
    console.error('Agent chat error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent execution failed' },
      { status: 500 }
    )
  }
}

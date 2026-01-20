import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAgentForChat } from '@/lib/agent-runtime'

// POST /api/admin/workspaces/[id]/agent-channels/[channelId]/messages/send
// Send a message to an agent channel and get a response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; channelId: string }> }
) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id: workspaceId, channelId } = await params
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify channel exists and is an agent channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, workspace_id, is_agent_channel, linked_agent_id')
      .eq('id', channelId)
      .eq('workspace_id', workspaceId)
      .single()

    if (channelError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    if (!channel.is_agent_channel || !channel.linked_agent_id) {
      return NextResponse.json({ error: 'Not an agent channel or no linked agent' }, { status: 400 })
    }

    // Get workspace name for context
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single()

    // Get the user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', user!.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Save the user's message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        profile_id: userProfile.id,
        content,
        is_agent_request: true,
        agent_response_status: 'pending',
      })
      .select()
      .single()

    if (userMsgError) {
      console.error('Failed to save user message:', userMsgError)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // Get recent conversation history (last 10 messages for context)
    const { data: recentMessages } = await supabase
      .from('messages')
      .select(`
        content,
        profile:profiles(is_agent)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Build conversation history (reverse to chronological, exclude current message)
    const conversationHistory = (recentMessages || [])
      .slice(1) // Exclude the message we just inserted
      .reverse()
      .map(msg => ({
        role: (msg.profile as { is_agent?: boolean })?.is_agent ? 'assistant' : 'user',
        content: msg.content,
      })) as Array<{ role: 'user' | 'assistant'; content: string }>

    // Get the agent's profile ID for saving the response
    const { data: agentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('linked_agent_id', channel.linked_agent_id)
      .eq('agent_workspace_id', workspaceId)
      .eq('is_agent', true)
      .single()

    if (!agentProfile) {
      // Update user message status to failed
      await supabase
        .from('messages')
        .update({ agent_response_status: 'failed' })
        .eq('id', userMessage.id)

      return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 })
    }

    try {
      // Run the agent with workspace/user context
      const result = await runAgentForChat(
        channel.linked_agent_id,
        channelId,
        content,
        conversationHistory,
        {
          userId: user!.id,
          userName: userProfile.full_name || undefined,
          userEmail: user!.email || undefined,
          workspaceId,
          workspaceName: workspace?.name || undefined,
        }
      )

      // Save the agent's response
      const { data: agentMessage, error: agentMsgError } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          profile_id: agentProfile.id,
          content: result.response,
          is_agent_request: false,
          agent_request_id: userMessage.id,
        })
        .select(`
          id,
          channel_id,
          profile_id,
          content,
          is_agent_request,
          agent_request_id,
          created_at,
          profile:profiles(
            id,
            full_name,
            avatar_url,
            is_agent,
            agent_slug
          )
        `)
        .single()

      if (agentMsgError) {
        console.error('Failed to save agent response:', agentMsgError)
        await supabase
          .from('messages')
          .update({ agent_response_status: 'failed' })
          .eq('id', userMessage.id)
        return NextResponse.json({ error: 'Failed to save agent response' }, { status: 500 })
      }

      // Update user message status to completed
      await supabase
        .from('messages')
        .update({ agent_response_status: 'completed' })
        .eq('id', userMessage.id)

      return NextResponse.json({
        userMessage: {
          ...userMessage,
          agent_response_status: 'completed',
        },
        agentMessage,
        usage: result.usage,
      })
    } catch (agentError) {
      console.error('Agent execution error:', agentError)

      // Update user message status to failed
      await supabase
        .from('messages')
        .update({ agent_response_status: 'failed' })
        .eq('id', userMessage.id)

      return NextResponse.json({
        error: agentError instanceof Error ? agentError.message : 'Agent execution failed',
        userMessage: {
          ...userMessage,
          agent_response_status: 'failed',
        },
      }, { status: 500 })
    }
  } catch (err) {
    console.error('Send message error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

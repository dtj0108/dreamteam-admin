import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; channelId: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id: workspaceId, channelId } = await params
  const supabase = createAdminClient()

  // Get pagination params
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const before = searchParams.get('before') // For pagination - get messages before this timestamp

  // Verify workspace and channel exist
  const { data: channel, error: channelError } = await supabase
    .from('channels')
    .select('id, workspace_id, is_agent_channel')
    .eq('id', channelId)
    .eq('workspace_id', workspaceId)
    .single()

  if (channelError || !channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  if (!channel.is_agent_channel) {
    return NextResponse.json({ error: 'Not an agent channel' }, { status: 400 })
  }

  // Build query for messages with profile info
  let query = supabase
    .from('messages')
    .select(`
      id,
      channel_id,
      profile_id,
      content,
      is_agent_request,
      agent_request_id,
      agent_response_status,
      created_at,
      profile:profiles(
        id,
        full_name,
        avatar_url,
        is_agent,
        agent_slug
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Add pagination filter if provided
  if (before) {
    query = query.lt('created_at', before)
  }

  const { data: messages, error: messagesError } = await query

  if (messagesError) {
    console.error('Messages query error:', messagesError)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  // Reverse to get chronological order for display
  const orderedMessages = (messages || []).reverse()

  return NextResponse.json({
    messages: orderedMessages,
    has_more: (messages || []).length === limit,
  })
}

// Endpoint to get a single message by ID (used for real-time updates)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; channelId: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { channelId } = await params
  const body = await request.json()
  const { message_id } = body

  if (!message_id) {
    return NextResponse.json({ error: 'message_id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: message, error: messageError } = await supabase
    .from('messages')
    .select(`
      id,
      channel_id,
      profile_id,
      content,
      is_agent_request,
      agent_request_id,
      agent_response_status,
      created_at,
      profile:profiles(
        id,
        full_name,
        avatar_url,
        is_agent,
        agent_slug
      )
    `)
    .eq('id', message_id)
    .eq('channel_id', channelId)
    .single()

  if (messageError || !message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  return NextResponse.json({ message })
}

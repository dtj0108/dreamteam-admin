import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id: workspaceId } = await params
  const supabase = createAdminClient()

  // Verify workspace exists
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .single()

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Get all agent channels with linked agent profile info
  const { data: channels, error: channelsError } = await supabase
    .from('channels')
    .select(`
      id,
      workspace_id,
      name,
      description,
      is_agent_channel,
      linked_agent_id,
      created_at,
      updated_at
    `)
    .eq('workspace_id', workspaceId)
    .eq('is_agent_channel', true)
    .order('created_at', { ascending: true })

  if (channelsError) {
    console.error('Channels query error:', channelsError)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }

  // Get linked agent profiles for each channel
  const linkedAgentIds = (channels || [])
    .map(c => c.linked_agent_id)
    .filter(Boolean) as string[]

  let agentProfiles: Record<string, { full_name: string | null; avatar_url: string | null; agent_slug: string | null }> = {}

  if (linkedAgentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('linked_agent_id, full_name, avatar_url, agent_slug')
      .eq('agent_workspace_id', workspaceId)
      .eq('is_agent', true)
      .in('linked_agent_id', linkedAgentIds)

    agentProfiles = (profiles || []).reduce((acc, p) => {
      if (p.linked_agent_id) {
        acc[p.linked_agent_id] = {
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          agent_slug: p.agent_slug,
        }
      }
      return acc
    }, {} as Record<string, { full_name: string | null; avatar_url: string | null; agent_slug: string | null }>)
  }

  // Enrich channels with agent profile info
  const enrichedChannels = (channels || []).map(channel => ({
    ...channel,
    agent_name: channel.linked_agent_id ? agentProfiles[channel.linked_agent_id]?.full_name : null,
    agent_avatar_url: channel.linked_agent_id ? agentProfiles[channel.linked_agent_id]?.avatar_url : null,
    agent_slug: channel.linked_agent_id ? agentProfiles[channel.linked_agent_id]?.agent_slug : null,
  }))

  return NextResponse.json({ channels: enrichedChannels })
}

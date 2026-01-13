import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents/[id]/test - List test sessions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('agent_test_sessions')
    .select(`
      *,
      started_by_profile:profiles!agent_test_sessions_started_by_fkey(id, name, email)
    `)
    .eq('agent_id', id)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (dbError) {
    console.error('Fetch test sessions error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch test sessions' }, { status: 500 })
  }

  return NextResponse.json({ sessions: data || [] })
}

// POST /api/admin/agents/[id]/test - Start a new test session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { tool_mode = 'mock', mock_responses = {} } = body

  // Validate tool_mode
  const validModes = ['mock', 'simulate', 'live']
  if (!validModes.includes(tool_mode)) {
    return NextResponse.json(
      { error: 'Invalid tool_mode. Must be: mock, simulate, or live' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Verify agent exists and get current version
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('id, name, current_version')
    .eq('id', id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Create test session
  const { data: session, error: sessionError } = await supabase
    .from('agent_test_sessions')
    .insert({
      agent_id: id,
      version: agent.current_version || 1,
      started_by: user!.id,
      test_config: {
        tool_mode,
        mock_responses
      },
      status: 'active'
    })
    .select()
    .single()

  if (sessionError) {
    console.error('Create test session error:', sessionError)
    return NextResponse.json({ error: 'Failed to create test session' }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'agent_test_session_started',
    'agent_test_session',
    session.id,
    { agent_id: id, version: agent.current_version, tool_mode },
    request
  )

  return NextResponse.json({ session }, { status: 201 })
}

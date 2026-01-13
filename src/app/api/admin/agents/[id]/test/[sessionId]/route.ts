import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents/[id]/test/[sessionId] - Get test session with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id, sessionId } = await params
  const supabase = createAdminClient()

  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from('agent_test_sessions')
    .select(`
      *,
      started_by_profile:profiles!agent_test_sessions_started_by_fkey(id, name, email)
    `)
    .eq('id', sessionId)
    .eq('agent_id', id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Test session not found' }, { status: 404 })
  }

  // Fetch messages
  const { data: messages } = await supabase
    .from('agent_test_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('sequence_number', { ascending: true })

  return NextResponse.json({
    session,
    messages: messages || []
  })
}

// DELETE /api/admin/agents/[id]/test/[sessionId] - End test session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id, sessionId } = await params
  const body = await request.json().catch(() => ({}))
  const { notes } = body

  const supabase = createAdminClient()

  // Update session status to completed
  const { data: session, error: updateError } = await supabase
    .from('agent_test_sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      notes: notes || null
    })
    .eq('id', sessionId)
    .eq('agent_id', id)
    .select()
    .single()

  if (updateError) {
    console.error('End test session error:', updateError)
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Test session not found' }, { status: 404 })
  }

  await logAdminAction(
    user!.id,
    'agent_test_session_ended',
    'agent_test_session',
    sessionId,
    { agent_id: id, total_turns: session.total_turns },
    request
  )

  return NextResponse.json({ session })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/teachings - List all teachings
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const skill_id = searchParams.get('skill_id')
  const status = searchParams.get('status')
  const workspace_id = searchParams.get('workspace_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = createAdminClient()

  let query = supabase
    .from('skill_teachings')
    .select('*, skill:agent_skills(id, name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (skill_id) {
    query = query.eq('skill_id', skill_id)
  }

  if (status) {
    query = query.eq('analysis_status', status)
  }

  if (workspace_id) {
    query = query.eq('workspace_id', workspace_id)
  }

  const { data, error: dbError, count } = await query

  if (dbError) {
    console.error('Teachings query error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch teachings' }, { status: 500 })
  }

  return NextResponse.json({ teachings: data || [], total: count || 0 })
}

// POST /api/admin/teachings - Capture new teaching
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const {
    skill_id,
    agent_id,
    workspace_id,
    user_id,
    original_output,
    corrected_output,
    conversation_id,
    message_context,
    user_instruction
  } = body

  if (!skill_id) {
    return NextResponse.json({ error: 'skill_id is required' }, { status: 400 })
  }

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  if (!original_output || !corrected_output) {
    return NextResponse.json(
      { error: 'Both original_output and corrected_output are required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Verify skill exists
  const { data: skill } = await supabase
    .from('agent_skills')
    .select('id')
    .eq('id', skill_id)
    .single()

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  const { data, error: dbError } = await supabase
    .from('skill_teachings')
    .insert({
      skill_id,
      agent_id: agent_id || null,
      workspace_id,
      user_id: user_id || user!.id,
      original_output,
      corrected_output,
      conversation_id: conversation_id || null,
      message_context: message_context || {},
      user_instruction: user_instruction || null,
      analysis_status: 'pending'
    })
    .select('*, skill:agent_skills(id, name)')
    .single()

  if (dbError) {
    console.error('Create teaching error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'teaching_created',
    'skill_teaching',
    data.id,
    { skill_id },
    request
  )

  return NextResponse.json({ teaching: data }, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents/[id]/skills - Get agent's skill assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('ai_agent_skills')
    .select(`
      skill_id,
      skill:agent_skills(id, name, description, category, skill_content, triggers, templates, edge_cases, is_enabled)
    `)
    .eq('agent_id', id)

  if (dbError) {
    console.error('Fetch agent skills error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 })
  }

  return NextResponse.json({ skills: data || [] })
}

// PUT /api/admin/agents/[id]/skills - Replace agent's skill assignments
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { skill_ids } = body as { skill_ids: string[] }

  if (!Array.isArray(skill_ids)) {
    return NextResponse.json({ error: 'skill_ids must be an array' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify agent exists
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Delete existing assignments
  await supabase
    .from('ai_agent_skills')
    .delete()
    .eq('agent_id', id)

  // Insert new assignments
  if (skill_ids.length > 0) {
    const assignments = skill_ids.map(skill_id => ({
      agent_id: id,
      skill_id
    }))

    const { error: insertError } = await supabase
      .from('ai_agent_skills')
      .insert(assignments)

    if (insertError) {
      console.error('Insert agent skills error:', insertError)
      return NextResponse.json({ error: 'Failed to assign skills' }, { status: 500 })
    }
  }

  await logAdminAction(
    user!.id,
    'agent_skills_updated',
    'ai_agent',
    id,
    { skill_ids, skill_count: skill_ids.length },
    request
  )

  // Fetch updated assignments
  const { data: updatedSkills } = await supabase
    .from('ai_agent_skills')
    .select(`
      skill_id,
      skill:agent_skills(id, name, description, category, skill_content, triggers, templates, edge_cases, is_enabled)
    `)
    .eq('agent_id', id)

  return NextResponse.json({ skills: updatedSkills || [] })
}

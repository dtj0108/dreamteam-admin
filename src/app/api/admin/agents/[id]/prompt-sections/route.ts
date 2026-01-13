import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents/[id]/prompt-sections - Get prompt sections
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('agent_prompt_sections')
    .select('*')
    .eq('agent_id', id)
    .order('position', { ascending: true })

  if (dbError) {
    console.error('Fetch prompt sections error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch prompt sections' }, { status: 500 })
  }

  return NextResponse.json({ sections: data || [] })
}

// POST /api/admin/agents/[id]/prompt-sections - Create a prompt section
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { section_type, section_title, section_content, position } = body

  // Validate section_type
  const validTypes = ['identity', 'personality', 'capabilities', 'constraints', 'examples', 'custom']
  if (!section_type || !validTypes.includes(section_type)) {
    return NextResponse.json(
      { error: 'Invalid section_type. Must be: identity, personality, capabilities, constraints, examples, or custom' },
      { status: 400 }
    )
  }

  if (!section_title || section_title.trim() === '') {
    return NextResponse.json({ error: 'section_title is required' }, { status: 400 })
  }

  if (!section_content || section_content.trim() === '') {
    return NextResponse.json({ error: 'section_content is required' }, { status: 400 })
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

  // Get next position if not specified
  let finalPosition = position
  if (finalPosition === undefined) {
    const { data: maxSection } = await supabase
      .from('agent_prompt_sections')
      .select('position')
      .eq('agent_id', id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    finalPosition = (maxSection?.position || 0) + 1
  }

  const { data, error: dbError } = await supabase
    .from('agent_prompt_sections')
    .insert({
      agent_id: id,
      section_type,
      section_title,
      section_content,
      position: finalPosition,
      is_enabled: true
    })
    .select()
    .single()

  if (dbError) {
    console.error('Create prompt section error:', dbError)
    return NextResponse.json({ error: 'Failed to create prompt section' }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'agent_prompt_section_created',
    'agent_prompt_section',
    data.id,
    { agent_id: id, section_type, section_title },
    request
  )

  return NextResponse.json({ section: data }, { status: 201 })
}

// PUT /api/admin/agents/[id]/prompt-sections - Bulk update/reorder sections
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { sections } = body as {
    sections: { id: string; position: number }[]
  }

  if (!Array.isArray(sections)) {
    return NextResponse.json({ error: 'sections must be an array' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Update positions for each section
  for (const section of sections) {
    await supabase
      .from('agent_prompt_sections')
      .update({ position: section.position })
      .eq('id', section.id)
      .eq('agent_id', id)
  }

  await logAdminAction(
    user!.id,
    'agent_prompt_sections_reordered',
    'ai_agent',
    id,
    { section_count: sections.length },
    request
  )

  // Fetch updated sections
  const { data: updatedSections } = await supabase
    .from('agent_prompt_sections')
    .select('*')
    .eq('agent_id', id)
    .order('position', { ascending: true })

  return NextResponse.json({ sections: updatedSections || [] })
}

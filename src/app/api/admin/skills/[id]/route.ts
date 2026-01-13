import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/skills/[id] - Get single skill with versions and rules
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Fetch skill
  const { data: skill, error: skillError } = await supabase
    .from('agent_skills')
    .select('*')
    .eq('id', id)
    .single()

  if (skillError || !skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  // Fetch versions
  const { data: versions } = await supabase
    .from('skill_versions')
    .select('*')
    .eq('skill_id', id)
    .order('version', { ascending: false })
    .limit(10)

  // Fetch learned rules
  const { data: learnedRules } = await supabase
    .from('skill_learned_rules')
    .select('*')
    .eq('skill_id', id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    skill,
    versions: versions || [],
    learnedRules: learnedRules || []
  })
}

// PATCH /api/admin/skills/[id] - Update skill
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const supabase = createAdminClient()

  // Check if skill exists and if it's a system skill
  const { data: existingSkill } = await supabase
    .from('agent_skills')
    .select('is_system, name, version, skill_content, triggers, templates, edge_cases')
    .eq('id', id)
    .single()

  if (!existingSkill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  // System skills can only have is_enabled toggled
  const allowedFields = existingSkill.is_system
    ? ['is_enabled']
    : ['name', 'description', 'department_id', 'skill_content', 'category', 'triggers', 'templates', 'edge_cases', 'is_enabled']

  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  // If content changed, increment version
  const contentChanged = updates.skill_content || updates.triggers || updates.templates || updates.edge_cases
  if (contentChanged && !existingSkill.is_system) {
    updates.version = existingSkill.version + 1
  }

  const { data, error: dbError } = await supabase
    .from('agent_skills')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json({ error: 'A skill with this name already exists' }, { status: 400 })
    }
    console.error('Update skill error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Create version record if content changed
  if (contentChanged && !existingSkill.is_system) {
    await supabase
      .from('skill_versions')
      .insert({
        skill_id: id,
        version: data.version,
        skill_content: data.skill_content,
        triggers: data.triggers,
        templates: data.templates,
        edge_cases: data.edge_cases,
        change_type: 'manual_edit',
        change_description: 'Manual skill update',
        change_details: { updated_fields: Object.keys(updates) },
        created_by: user!.id
      })
  }

  await logAdminAction(
    user!.id,
    'skill_updated',
    'agent_skill',
    id,
    updates,
    request
  )

  return NextResponse.json({ skill: data })
}

// DELETE /api/admin/skills/[id] - Delete skill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Check if skill is a system skill
  const { data: skill } = await supabase
    .from('agent_skills')
    .select('is_system, name')
    .eq('id', id)
    .single()

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  if (skill.is_system) {
    return NextResponse.json(
      { error: 'Cannot delete system skills. Disable them instead.' },
      { status: 400 }
    )
  }

  const { error: dbError } = await supabase
    .from('agent_skills')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('Delete skill error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'skill_deleted',
    'agent_skill',
    id,
    { name: skill.name },
    request
  )

  return NextResponse.json({ success: true })
}

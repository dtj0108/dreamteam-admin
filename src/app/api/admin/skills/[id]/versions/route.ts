import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/skills/[id]/versions - List skill versions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('skill_versions')
    .select('*')
    .eq('skill_id', id)
    .order('version', { ascending: false })
    .limit(limit)

  if (dbError) {
    console.error('Skill versions query error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
  }

  return NextResponse.json({ versions: data || [] })
}

// POST /api/admin/skills/[id]/versions/rollback - Rollback to a specific version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { version } = body

  if (!version) {
    return NextResponse.json({ error: 'Version number is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Check if skill exists
  const { data: skill } = await supabase
    .from('agent_skills')
    .select('is_system, version')
    .eq('id', id)
    .single()

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  if (skill.is_system) {
    return NextResponse.json({ error: 'Cannot rollback system skills' }, { status: 400 })
  }

  // Get the target version
  const { data: targetVersion } = await supabase
    .from('skill_versions')
    .select('*')
    .eq('skill_id', id)
    .eq('version', version)
    .single()

  if (!targetVersion) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  const newVersion = skill.version + 1

  // Update the skill with the rolled back content
  const { data: updatedSkill, error: updateError } = await supabase
    .from('agent_skills')
    .update({
      skill_content: targetVersion.skill_content,
      triggers: targetVersion.triggers,
      templates: targetVersion.templates,
      edge_cases: targetVersion.edge_cases,
      version: newVersion
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('Rollback error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Create version record for the rollback
  await supabase
    .from('skill_versions')
    .insert({
      skill_id: id,
      version: newVersion,
      skill_content: targetVersion.skill_content,
      triggers: targetVersion.triggers,
      templates: targetVersion.templates,
      edge_cases: targetVersion.edge_cases,
      change_type: 'rollback',
      change_description: `Rolled back to version ${version}`,
      change_details: { rolled_back_from: skill.version, rolled_back_to: version },
      created_by: user!.id
    })

  await logAdminAction(
    user!.id,
    'skill_rollback',
    'agent_skill',
    id,
    { from_version: skill.version, to_version: version },
    request
  )

  return NextResponse.json({ skill: updatedSkill })
}

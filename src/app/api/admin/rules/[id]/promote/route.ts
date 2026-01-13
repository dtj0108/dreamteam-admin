import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/rules/[id]/promote - Promote rule to global scope
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Get the rule
  const { data: rule } = await supabase
    .from('skill_learned_rules')
    .select('*, skill:agent_skills(id, version)')
    .eq('id', id)
    .single()

  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
  }

  if (rule.scope === 'global') {
    return NextResponse.json({ error: 'Rule is already global' }, { status: 400 })
  }

  // Promote to global
  const { data: updatedRule, error: updateError } = await supabase
    .from('skill_learned_rules')
    .update({
      scope: 'global',
      workspace_id: null,
      is_reviewed: true,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('Promote rule error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Create a version record for this promotion
  if (rule.skill) {
    const newVersion = rule.skill.version + 1

    // Get current skill content
    const { data: skill } = await supabase
      .from('agent_skills')
      .select('skill_content, triggers, templates, edge_cases')
      .eq('id', rule.skill_id)
      .single()

    if (skill) {
      // Update skill version
      await supabase
        .from('agent_skills')
        .update({ version: newVersion })
        .eq('id', rule.skill_id)

      // Create version record
      await supabase
        .from('skill_versions')
        .insert({
          skill_id: rule.skill_id,
          version: newVersion,
          skill_content: skill.skill_content,
          triggers: skill.triggers,
          templates: skill.templates,
          edge_cases: skill.edge_cases,
          change_type: 'rule_promoted',
          change_description: `Promoted rule to global: ${rule.rule_content.substring(0, 50)}...`,
          change_details: { rule_id: id, rule_type: rule.rule_type },
          created_by: user!.id
        })
    }
  }

  await logAdminAction(
    user!.id,
    'rule_promoted',
    'skill_learned_rule',
    id,
    { skill_id: rule.skill_id },
    request
  )

  return NextResponse.json({ rule: updatedRule })
}

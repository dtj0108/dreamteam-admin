import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/teaching-patterns/[id]/promote - Promote pattern to global rule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { rule_type, rule_content, rule_description } = body

  if (!rule_type || !rule_content) {
    return NextResponse.json(
      { error: 'rule_type and rule_content are required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Get the pattern
  const { data: pattern } = await supabase
    .from('skill_teaching_patterns')
    .select('*, skill:agent_skills(id, learned_rules_count, version)')
    .eq('id', id)
    .single()

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  if (pattern.is_promoted) {
    return NextResponse.json({ error: 'Pattern already promoted' }, { status: 400 })
  }

  // Create global learned rule
  const { data: rule, error: ruleError } = await supabase
    .from('skill_learned_rules')
    .insert({
      skill_id: pattern.skill_id,
      teaching_id: null, // Pattern-based, not from single teaching
      rule_type,
      rule_content,
      rule_description: rule_description || pattern.pattern_description,
      scope: 'global',
      workspace_id: null,
      confidence_score: 0.9, // High confidence for promoted patterns
      is_reviewed: true,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
      is_active: true
    })
    .select()
    .single()

  if (ruleError) {
    console.error('Create rule error:', ruleError)
    return NextResponse.json({ error: ruleError.message }, { status: 500 })
  }

  // Mark pattern as promoted
  await supabase
    .from('skill_teaching_patterns')
    .update({
      is_promoted: true,
      promoted_to_rule_id: rule.id
    })
    .eq('id', id)

  // Update skill
  if (pattern.skill) {
    const newVersion = (pattern.skill.version || 1) + 1

    await supabase
      .from('agent_skills')
      .update({
        learned_rules_count: (pattern.skill.learned_rules_count || 0) + 1,
        version: newVersion
      })
      .eq('id', pattern.skill_id)

    // Create version record
    const { data: skill } = await supabase
      .from('agent_skills')
      .select('skill_content, triggers, templates, edge_cases')
      .eq('id', pattern.skill_id)
      .single()

    if (skill) {
      await supabase
        .from('skill_versions')
        .insert({
          skill_id: pattern.skill_id,
          version: newVersion,
          skill_content: skill.skill_content,
          triggers: skill.triggers,
          templates: skill.templates,
          edge_cases: skill.edge_cases,
          change_type: 'rule_promoted',
          change_description: `Promoted pattern to global rule: ${pattern.pattern_description || rule_content.substring(0, 50)}`,
          change_details: { pattern_id: id, rule_id: rule.id, occurrence_count: pattern.occurrence_count },
          created_by: user!.id
        })
    }
  }

  await logAdminAction(
    user!.id,
    'pattern_promoted',
    'skill_teaching_pattern',
    id,
    { skill_id: pattern.skill_id, rule_id: rule.id },
    request
  )

  return NextResponse.json({ rule })
}

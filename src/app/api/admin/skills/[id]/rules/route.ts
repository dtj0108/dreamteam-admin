import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const validRuleTypes = ['instruction', 'template', 'edge_case', 'trigger', 'tone', 'format']

// GET /api/admin/skills/[id]/rules - List learned rules for skill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const rule_type = searchParams.get('rule_type')
  const scope = searchParams.get('scope')
  const active = searchParams.get('active')

  const supabase = createAdminClient()

  let query = supabase
    .from('skill_learned_rules')
    .select('*')
    .eq('skill_id', id)
    .order('created_at', { ascending: false })

  if (rule_type) {
    query = query.eq('rule_type', rule_type)
  }

  if (scope) {
    query = query.eq('scope', scope)
  }

  if (active !== null) {
    query = query.eq('is_active', active === 'true')
  }

  const { data, error: dbError } = await query

  if (dbError) {
    console.error('Rules query error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
  }

  return NextResponse.json({ rules: data || [] })
}

// POST /api/admin/skills/[id]/rules - Create manual rule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { rule_type, rule_content, rule_description, conditions, scope, workspace_id } = body

  if (!rule_type || !validRuleTypes.includes(rule_type)) {
    return NextResponse.json(
      { error: `Invalid rule_type. Must be one of: ${validRuleTypes.join(', ')}` },
      { status: 400 }
    )
  }

  if (!rule_content) {
    return NextResponse.json({ error: 'rule_content is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify skill exists
  const { data: skill } = await supabase
    .from('agent_skills')
    .select('id, learned_rules_count')
    .eq('id', id)
    .single()

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  // Create the rule
  const { data, error: dbError } = await supabase
    .from('skill_learned_rules')
    .insert({
      skill_id: id,
      rule_type,
      rule_content,
      rule_description: rule_description || null,
      conditions: conditions || {},
      scope: scope || 'workspace',
      workspace_id: workspace_id || null,
      confidence_score: 1.0, // Manual rules have full confidence
      is_active: true
    })
    .select()
    .single()

  if (dbError) {
    console.error('Create rule error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Update learned rules count on skill
  await supabase
    .from('agent_skills')
    .update({ learned_rules_count: skill.learned_rules_count + 1 })
    .eq('id', id)

  await logAdminAction(
    user!.id,
    'rule_created',
    'skill_learned_rule',
    data.id,
    { skill_id: id, rule_type },
    request
  )

  return NextResponse.json({ rule: data }, { status: 201 })
}

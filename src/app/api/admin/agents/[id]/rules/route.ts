import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents/[id]/rules - Get agent's rules
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('agent_rules')
    .select('*')
    .eq('agent_id', id)
    .order('priority', { ascending: true })

  if (dbError) {
    console.error('Fetch agent rules error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
  }

  return NextResponse.json({ rules: data || [] })
}

// POST /api/admin/agents/[id]/rules - Create a new rule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { rule_type, rule_content, condition, priority } = body

  // Validate rule_type
  const validTypes = ['always', 'never', 'when', 'respond_with']
  if (!rule_type || !validTypes.includes(rule_type)) {
    return NextResponse.json(
      { error: 'Invalid rule_type. Must be: always, never, when, or respond_with' },
      { status: 400 }
    )
  }

  if (!rule_content || rule_content.trim() === '') {
    return NextResponse.json({ error: 'rule_content is required' }, { status: 400 })
  }

  // 'when' rules require a condition
  if (rule_type === 'when' && (!condition || condition.trim() === '')) {
    return NextResponse.json({ error: 'condition is required for "when" rules' }, { status: 400 })
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

  // Get next priority if not specified
  let finalPriority = priority
  if (finalPriority === undefined) {
    const { data: maxRule } = await supabase
      .from('agent_rules')
      .select('priority')
      .eq('agent_id', id)
      .order('priority', { ascending: false })
      .limit(1)
      .single()

    finalPriority = (maxRule?.priority || 0) + 1
  }

  const { data, error: dbError } = await supabase
    .from('agent_rules')
    .insert({
      agent_id: id,
      rule_type,
      rule_content,
      condition: condition || null,
      priority: finalPriority,
      is_enabled: true
    })
    .select()
    .single()

  if (dbError) {
    console.error('Create agent rule error:', dbError)
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'agent_rule_created',
    'agent_rule',
    data.id,
    { agent_id: id, rule_type, rule_content },
    request
  )

  return NextResponse.json({ rule: data }, { status: 201 })
}

// PUT /api/admin/agents/[id]/rules - Bulk update/reorder rules
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { rules } = body as {
    rules: { id: string; priority: number }[]
  }

  if (!Array.isArray(rules)) {
    return NextResponse.json({ error: 'rules must be an array' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Update priorities for each rule
  for (const rule of rules) {
    await supabase
      .from('agent_rules')
      .update({ priority: rule.priority })
      .eq('id', rule.id)
      .eq('agent_id', id)
  }

  await logAdminAction(
    user!.id,
    'agent_rules_reordered',
    'ai_agent',
    id,
    { rule_count: rules.length },
    request
  )

  // Fetch updated rules
  const { data: updatedRules } = await supabase
    .from('agent_rules')
    .select('*')
    .eq('agent_id', id)
    .order('priority', { ascending: true })

  return NextResponse.json({ rules: updatedRules || [] })
}

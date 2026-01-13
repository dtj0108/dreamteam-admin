import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/admin/agents/[id]/rules/[ruleId] - Update a rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id, ruleId } = await params
  const body = await request.json()

  const allowedFields = ['rule_type', 'rule_content', 'condition', 'priority', 'is_enabled']
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  // Validate rule_type if provided
  if (updates.rule_type) {
    const validTypes = ['always', 'never', 'when', 'respond_with']
    if (!validTypes.includes(updates.rule_type as string)) {
      return NextResponse.json(
        { error: 'Invalid rule_type. Must be: always, never, when, or respond_with' },
        { status: 400 }
      )
    }
  }

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('agent_rules')
    .update(updates)
    .eq('id', ruleId)
    .eq('agent_id', id)
    .select()
    .single()

  if (dbError) {
    console.error('Update agent rule error:', dbError)
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
  }

  await logAdminAction(
    user!.id,
    'agent_rule_updated',
    'agent_rule',
    ruleId,
    { agent_id: id, ...updates },
    request
  )

  return NextResponse.json({ rule: data })
}

// DELETE /api/admin/agents/[id]/rules/[ruleId] - Delete a rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id, ruleId } = await params
  const supabase = createAdminClient()

  // Get rule before deletion
  const { data: rule } = await supabase
    .from('agent_rules')
    .select('rule_type, rule_content')
    .eq('id', ruleId)
    .eq('agent_id', id)
    .single()

  const { error: dbError } = await supabase
    .from('agent_rules')
    .delete()
    .eq('id', ruleId)
    .eq('agent_id', id)

  if (dbError) {
    console.error('Delete agent rule error:', dbError)
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'agent_rule_deleted',
    'agent_rule',
    ruleId,
    { agent_id: id, rule_type: rule?.rule_type },
    request
  )

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/rules/[id] - Get single rule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('skill_learned_rules')
    .select('*, skill:agent_skills(id, name)')
    .eq('id', id)
    .single()

  if (dbError || !data) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
  }

  return NextResponse.json({ rule: data })
}

// PATCH /api/admin/rules/[id] - Update rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const allowedFields = ['rule_content', 'rule_description', 'conditions', 'is_active', 'scope']
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('skill_learned_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    console.error('Update rule error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'rule_updated',
    'skill_learned_rule',
    id,
    updates,
    request
  )

  return NextResponse.json({ rule: data })
}

// DELETE /api/admin/rules/[id] - Delete rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Get skill ID before deleting
  const { data: rule } = await supabase
    .from('skill_learned_rules')
    .select('skill_id')
    .eq('id', id)
    .single()

  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
  }

  const { error: dbError } = await supabase
    .from('skill_learned_rules')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('Delete rule error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Decrement learned rules count
  const { data: skill } = await supabase
    .from('agent_skills')
    .select('learned_rules_count')
    .eq('id', rule.skill_id)
    .single()

  if (skill) {
    await supabase
      .from('agent_skills')
      .update({ learned_rules_count: Math.max(0, skill.learned_rules_count - 1) })
      .eq('id', rule.skill_id)
  }

  await logAdminAction(
    user!.id,
    'rule_deleted',
    'skill_learned_rule',
    id,
    { skill_id: rule.skill_id },
    request
  )

  return NextResponse.json({ success: true })
}

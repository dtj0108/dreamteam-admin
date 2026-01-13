import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents/[id] - Get single agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('ai_agents')
    .select(`
      *,
      department:agent_departments(id, name)
    `)
    .eq('id', id)
    .single()

  if (dbError || !data) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  return NextResponse.json({ agent: data })
}

// PATCH /api/admin/agents/[id] - Update agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const allowedFields = [
    'name', 'description', 'department_id', 'avatar_url', 'model',
    'system_prompt', 'permission_mode', 'max_turns', 'is_enabled',
    'is_head', 'config'
  ]
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (updates.model && !['sonnet', 'opus', 'haiku'].includes(updates.model as string)) {
    return NextResponse.json(
      { error: 'Invalid model. Must be sonnet, opus, or haiku' },
      { status: 400 }
    )
  }

  if (updates.permission_mode && !['default', 'acceptEdits', 'bypassPermissions'].includes(updates.permission_mode as string)) {
    return NextResponse.json(
      { error: 'Invalid permission_mode' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('ai_agents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    console.error('Update agent error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  await logAdminAction(
    user!.id,
    'agent_updated',
    'ai_agent',
    id,
    updates,
    request
  )

  return NextResponse.json({ agent: data })
}

// DELETE /api/admin/agents/[id] - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Get agent name before deletion
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('name')
    .eq('id', id)
    .single()

  const { error: dbError } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('Delete agent error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'agent_deleted',
    'ai_agent',
    id,
    { name: agent?.name },
    request
  )

  return NextResponse.json({ success: true })
}

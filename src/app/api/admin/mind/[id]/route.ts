import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/mind/[id] - Get single mind file with usage info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: mind, error: mindError } = await supabase
    .from('agent_mind')
    .select('*')
    .eq('id', id)
    .single()

  if (mindError || !mind) {
    return NextResponse.json({ error: 'Mind file not found' }, { status: 404 })
  }

  const { data: assignments } = await supabase
    .from('ai_agent_mind')
    .select('agent_id')
    .eq('mind_id', id)

  const usedByAgentCount = assignments?.length || 0

  return NextResponse.json({ mind, usedByAgentCount })
}

// PATCH /api/admin/mind/[id] - Update mind file
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const allowedFields = [
    'name',
    'slug',
    'description',
    'category',
    'content',
    'content_type',
    'position',
    'is_enabled',
    'workspace_id',
    'is_system',
    'scope',
    'department_id'
  ]
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (updates.category) {
    const validCategories = ['finance', 'crm', 'team', 'projects', 'knowledge', 'communications', 'goals', 'shared']
    if (!validCategories.includes(updates.category as string)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
  }

  if (updates.content_type) {
    const validContentTypes = ['responsibilities', 'workflows', 'policies', 'metrics', 'examples', 'general']
    if (!validContentTypes.includes(updates.content_type as string)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }
  }

  if (updates.scope) {
    const validScopes = ['agent', 'department', 'company']
    if (!validScopes.includes(updates.scope as string)) {
      return NextResponse.json({ error: 'Invalid scope. Must be agent, department, or company' }, { status: 400 })
    }
  }

  if (updates.scope === 'department' && !updates.department_id) {
    return NextResponse.json({ error: 'department_id is required when scope is department' }, { status: 400 })
  }

  if (updates.scope && updates.scope !== 'department' && updates.department_id) {
    return NextResponse.json({ error: 'department_id should only be set when scope is department' }, { status: 400 })
  }

  if (updates.is_system && updates.workspace_id) {
    return NextResponse.json({ error: 'System templates cannot have a workspace_id' }, { status: 400 })
  }

  if (updates.is_system === false && !updates.workspace_id) {
    return NextResponse.json({ error: 'Workspace-specific mind files must have a workspace_id' }, { status: 400 })
  }

  if ((updates.scope === 'company' || updates.scope === 'department') && updates.is_system) {
    return NextResponse.json({ error: 'Company and department scoped mind files must belong to a workspace' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error: dbError } = await supabase
    .from('agent_mind')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json({ error: 'A mind file with this slug already exists' }, { status: 400 })
    }
    console.error('Update mind error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'mind_updated',
    'agent_mind',
    id,
    updates,
    request
  )

  return NextResponse.json({ mind: data })
}

// DELETE /api/admin/mind/[id] - Delete mind file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: mind } = await supabase
    .from('agent_mind')
    .select('id, name, is_system')
    .eq('id', id)
    .single()

  if (!mind) {
    return NextResponse.json({ error: 'Mind file not found' }, { status: 404 })
  }

  const { error: dbError } = await supabase
    .from('agent_mind')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('Delete mind error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'mind_deleted',
    'agent_mind',
    id,
    { name: mind.name, is_system: mind.is_system },
    request
  )

  return NextResponse.json({ success: true })
}


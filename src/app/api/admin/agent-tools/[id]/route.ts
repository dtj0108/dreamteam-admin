import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agent-tools/[id] - Get single tool
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('agent_tools')
    .select('*')
    .eq('id', id)
    .single()

  if (dbError || !data) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  return NextResponse.json({ tool: data })
}

// PATCH /api/admin/agent-tools/[id] - Update tool
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const supabase = createAdminClient()

  // Check if tool is built-in
  const { data: existingTool } = await supabase
    .from('agent_tools')
    .select('is_builtin, name')
    .eq('id', id)
    .single()

  if (!existingTool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  // Built-in tools can only have is_enabled toggled
  const allowedFields = existingTool.is_builtin
    ? ['is_enabled']
    : ['name', 'description', 'category', 'input_schema', 'is_enabled']

  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  const validCategories = ['finance', 'crm', 'team', 'projects', 'knowledge', 'communications', 'goals', 'agents']
  if (updates.category && !validCategories.includes(updates.category as string)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
      { status: 400 }
    )
  }

  const { data, error: dbError } = await supabase
    .from('agent_tools')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json({ error: 'A tool with this name already exists' }, { status: 400 })
    }
    console.error('Update tool error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'tool_updated',
    'agent_tool',
    id,
    updates,
    request
  )

  return NextResponse.json({ tool: data })
}

// DELETE /api/admin/agent-tools/[id] - Delete tool
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Check if tool is built-in
  const { data: tool } = await supabase
    .from('agent_tools')
    .select('is_builtin, name')
    .eq('id', id)
    .single()

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  if (tool.is_builtin) {
    return NextResponse.json(
      { error: 'Cannot delete built-in tools. Disable them instead.' },
      { status: 400 }
    )
  }

  const { error: dbError } = await supabase
    .from('agent_tools')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('Delete tool error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'tool_deleted',
    'agent_tool',
    id,
    { name: tool.name },
    request
  )

  return NextResponse.json({ success: true })
}

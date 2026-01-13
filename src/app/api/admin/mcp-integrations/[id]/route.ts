import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/mcp-integrations/[id] - Get single integration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('mcp_integrations')
    .select('*')
    .eq('id', id)
    .single()

  if (dbError || !data) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  return NextResponse.json({ integration: data })
}

// PATCH /api/admin/mcp-integrations/[id] - Update integration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const allowedFields = ['name', 'description', 'type', 'config', 'auth_type', 'auth_config', 'is_enabled']
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (updates.type && !['stdio', 'sse', 'http'].includes(updates.type as string)) {
    return NextResponse.json(
      { error: 'Invalid type. Must be stdio, sse, or http' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('mcp_integrations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    console.error('Update MCP integration error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  await logAdminAction(
    user!.id,
    'mcp_integration_updated',
    'mcp_integration',
    id,
    updates,
    request
  )

  return NextResponse.json({ integration: data })
}

// DELETE /api/admin/mcp-integrations/[id] - Delete integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Get integration name before deletion
  const { data: integration } = await supabase
    .from('mcp_integrations')
    .select('name')
    .eq('id', id)
    .single()

  const { error: dbError } = await supabase
    .from('mcp_integrations')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('Delete MCP integration error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'mcp_integration_deleted',
    'mcp_integration',
    id,
    { name: integration?.name },
    request
  )

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'

// GET /api/admin/workspaces/[id] - Get workspace details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: workspace, error: dbError } = await supabase
    .from('workspaces')
    .select(
      `
      *,
      owner:profiles!workspaces_owner_id_fkey(id, email, name),
      workspace_members(
        profile:profiles(id, email, name, avatar_url),
        role,
        joined_at
      )
    `
    )
    .eq('id', id)
    .single()

  if (dbError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  return NextResponse.json({ workspace })
}

// PATCH /api/admin/workspaces/[id] - Update workspace
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: admin } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()

  const allowedFields = ['name', 'slug', 'description', 'avatar_url']
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  // Handle suspension
  if (body.is_suspended !== undefined) {
    updates.is_suspended = body.is_suspended
    if (body.is_suspended) {
      updates.suspended_at = new Date().toISOString()
      updates.suspended_reason = body.suspended_reason || null
    } else {
      updates.suspended_at = null
      updates.suspended_reason = null
    }
  }

  const { data: workspace, error: dbError } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(admin!.id, 'workspace_updated', 'workspace', id, updates, request)

  return NextResponse.json({ workspace })
}

// DELETE /api/admin/workspaces/[id] - Delete workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: admin } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // First remove all members
  await supabase.from('workspace_members').delete().eq('workspace_id', id)

  // Then delete the workspace
  const { error: dbError } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(admin!.id, 'workspace_deleted', 'workspace', id, {}, request)

  return NextResponse.json({ success: true })
}

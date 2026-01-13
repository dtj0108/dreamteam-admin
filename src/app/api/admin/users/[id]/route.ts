import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: user, error: dbError } = await supabase
    .from('profiles')
    .select(
      `
      *,
      workspace_members(
        workspace:workspaces(*),
        role,
        joined_at
      )
    `
    )
    .eq('id', id)
    .single()

  if (dbError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

// PATCH /api/admin/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: admin } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()

  // Only allow specific fields to be updated
  const allowedFields = ['is_superadmin', 'name']
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  const { data: user, error: dbError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(admin!.id, 'user_updated', 'user', id, updates, request)

  return NextResponse.json({ user })
}

// DELETE /api/admin/users/[id] - Suspend user (remove from all workspaces)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: admin } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Remove user from all workspaces (soft delete)
  await supabase.from('workspace_members').delete().eq('profile_id', id)

  await logAdminAction(admin!.id, 'user_suspended', 'user', id, {}, request)

  return NextResponse.json({ success: true })
}

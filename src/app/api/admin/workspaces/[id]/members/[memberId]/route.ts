import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id, memberId } = await params
  const supabase = createAdminClient()

  // Get member info before deletion
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select(`
      id,
      role,
      profile:profiles(email)
    `)
    .eq('id', memberId)
    .eq('workspace_id', id)
    .single()

  if (memberError || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Don't allow removing the owner
  if (member.role === 'owner') {
    return NextResponse.json(
      { error: 'Cannot remove workspace owner. Transfer ownership first.' },
      { status: 400 }
    )
  }

  // Delete the member
  const { error: deleteError } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId)

  if (deleteError) {
    console.error('Delete member error:', deleteError)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }

  const profileData = member.profile as unknown as { email: string } | null
  await logAdminAction(
    user!.id,
    'member_removed',
    'workspace_member',
    memberId,
    { workspace_id: id, email: profileData?.email },
    request
  )

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id, memberId } = await params
  const body = await request.json()
  const { role } = body

  if (!role || !['admin', 'member'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be "admin" or "member"' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Get current member info
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('id, role, profile:profiles(email)')
    .eq('id', memberId)
    .eq('workspace_id', id)
    .single()

  if (memberError || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Don't allow changing owner's role
  if (member.role === 'owner') {
    return NextResponse.json(
      { error: 'Cannot change owner role. Transfer ownership first.' },
      { status: 400 }
    )
  }

  // Update the role
  const { error: updateError } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('id', memberId)

  if (updateError) {
    console.error('Update member role error:', updateError)
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 })
  }

  const profileInfo = member.profile as unknown as { email: string } | null
  await logAdminAction(
    user!.id,
    'member_role_changed',
    'workspace_member',
    memberId,
    {
      workspace_id: id,
      email: profileInfo?.email,
      old_role: member.role,
      new_role: role
    },
    request
  )

  return NextResponse.json({ success: true })
}

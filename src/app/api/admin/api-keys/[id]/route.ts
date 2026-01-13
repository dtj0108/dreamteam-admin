import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'

// DELETE /api/admin/api-keys/[id] - Revoke API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: admin } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { error: dbError } = await supabase
    .from('workspace_api_keys')
    .update({ is_revoked: true })
    .eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(admin!.id, 'api_key_revoked', 'api_key', id, {}, request)

  return NextResponse.json({ success: true })
}

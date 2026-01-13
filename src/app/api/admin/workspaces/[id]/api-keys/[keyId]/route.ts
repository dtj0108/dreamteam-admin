import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id, keyId } = await params
  const supabase = createAdminClient()

  // Get API key info
  const { data: apiKey, error: keyError } = await supabase
    .from('workspace_api_keys')
    .select('id, name, key_prefix, is_revoked')
    .eq('id', keyId)
    .eq('workspace_id', id)
    .single()

  if (keyError || !apiKey) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 })
  }

  if (apiKey.is_revoked) {
    return NextResponse.json({ error: 'API key is already revoked' }, { status: 400 })
  }

  // Revoke the key (soft delete)
  const { error: revokeError } = await supabase
    .from('workspace_api_keys')
    .update({
      is_revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_by: user!.id
    })
    .eq('id', keyId)

  if (revokeError) {
    console.error('Revoke API key error:', revokeError)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'api_key_revoked',
    'workspace_api_key',
    keyId,
    {
      workspace_id: id,
      key_name: apiKey.name,
      key_prefix: apiKey.key_prefix
    },
    request
  )

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Verify workspace exists
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', id)
    .single()

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Get API keys (metadata only - never expose the actual key hash)
  const { data: apiKeys, error: keysError } = await supabase
    .from('workspace_api_keys')
    .select(`
      id,
      name,
      key_prefix,
      last_used_at,
      expires_at,
      is_revoked,
      revoked_at,
      created_at,
      created_by:profiles!workspace_api_keys_created_by_fkey(
        id,
        email,
        name
      ),
      revoked_by:profiles!workspace_api_keys_revoked_by_fkey(
        id,
        email,
        name
      )
    `)
    .eq('workspace_id', id)
    .order('created_at', { ascending: false })

  if (keysError) {
    console.error('API keys query error:', keysError)
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }

  return NextResponse.json({ api_keys: apiKeys || [] })
}

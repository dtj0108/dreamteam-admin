import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin } from '@/lib/admin-auth'

// GET /api/admin/api-keys - List all API keys
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const showRevoked = searchParams.get('showRevoked') === 'true'

  let query = supabase
    .from('workspace_api_keys')
    .select(
      `
      *,
      workspace:workspaces(id, name, slug)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (!showRevoked) {
    query = query.eq('is_revoked', false)
  }

  const { data: apiKeys, count, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({
    apiKeys,
    pagination: { page, limit, total: count },
  })
}

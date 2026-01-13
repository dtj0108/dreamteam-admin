import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin } from '@/lib/admin-auth'

// GET /api/admin/workspaces - List all workspaces
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search') || ''

  let query = supabase
    .from('workspaces')
    .select(
      `
      *,
      owner:profiles!workspaces_owner_id_fkey(id, email, name),
      workspace_members(count)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
  }

  const { data: workspaces, count, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({
    workspaces,
    pagination: { page, limit, total: count },
  })
}

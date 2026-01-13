import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin } from '@/lib/admin-auth'

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search') || ''

  let query = supabase
    .from('profiles')
    .select(
      `
      id, email, name, phone, avatar_url,
      is_superadmin, created_at, updated_at,
      workspace_members(
        workspace:workspaces(id, name, slug),
        role
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (search) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
  }

  const { data: users, count, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({
    users,
    pagination: { page, limit, total: count },
  })
}

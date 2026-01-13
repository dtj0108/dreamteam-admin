import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin } from '@/lib/admin-auth'

// GET /api/admin/audit-logs - List audit logs
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  const targetType = searchParams.get('target_type')

  let query = supabase
    .from('admin_audit_logs')
    .select(
      `
      *,
      admin:profiles!admin_audit_logs_admin_id_fkey(id, email, name)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (targetType) {
    query = query.eq('target_type', targetType)
  }

  const { data: logs, count, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({
    logs,
    pagination: { page, limit, total: count },
  })
}

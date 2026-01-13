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
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

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

  // Get audit logs for this workspace
  // Look for logs where target_id matches workspace or details contains workspace_id
  const { data: logs, error: logsError, count } = await supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      target_type,
      target_id,
      details,
      created_at,
      user:profiles!audit_logs_user_id_fkey(
        id,
        email,
        name
      )
    `, { count: 'exact' })
    .eq('workspace_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (logsError) {
    // If workspace_id column doesn't exist, try filtering by target_id
    const { data: fallbackLogs, error: fallbackError, count: fallbackCount } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        target_type,
        target_id,
        details,
        created_at,
        user:profiles!audit_logs_user_id_fkey(
          id,
          email,
          name
        )
      `, { count: 'exact' })
      .or(`target_id.eq.${id},details->workspace_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fallbackError) {
      console.error('Audit logs query error:', fallbackError)
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }

    return NextResponse.json({
      audit_logs: fallbackLogs || [],
      pagination: {
        page,
        limit,
        total: fallbackCount || 0
      }
    })
  }

  return NextResponse.json({
    audit_logs: logs || [],
    pagination: {
      page,
      limit,
      total: count || 0
    }
  })
}

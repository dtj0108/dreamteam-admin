import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MemoryScope, SummaryCategory } from '@/types/memory'

// GET /api/admin/memory/summaries - List summaries
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const scope = searchParams.get('scope') as MemoryScope | null
  const category = searchParams.get('category') as SummaryCategory | null
  const userId = searchParams.get('user_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    let query = supabase
      .from('agent_memory_summaries')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('last_consolidated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (scope) query = query.eq('scope', scope)
    if (category) query = query.eq('category', category)
    if (userId) query = query.eq('user_id', userId)

    const { data, error: dbError, count } = await query

    if (dbError) {
      throw dbError
    }

    return NextResponse.json({
      summaries: data || [],
      total: count || 0
    })
  } catch (err) {
    console.error('Failed to list summaries:', err)
    return NextResponse.json({ error: 'Failed to list summaries' }, { status: 500 })
  }
}

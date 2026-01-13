import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents - List all agents
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const departmentId = searchParams.get('department_id')
  const enabled = searchParams.get('enabled')

  const supabase = createAdminClient()

  let query = supabase
    .from('ai_agents')
    .select(`
      *,
      department:agent_departments(id, name)
    `)
    .order('name', { ascending: true })

  if (departmentId) {
    query = query.eq('department_id', departmentId)
  }

  if (enabled !== null) {
    query = query.eq('is_enabled', enabled === 'true')
  }

  const { data, error: dbError } = await query

  if (dbError) {
    console.error('Agents query error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }

  return NextResponse.json({ agents: data || [] })
}

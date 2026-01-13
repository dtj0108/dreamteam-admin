import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agent-tools - List all tools
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const builtin = searchParams.get('builtin')
  const enabled = searchParams.get('enabled')

  const supabase = createAdminClient()

  let query = supabase
    .from('agent_tools')
    .select('*')
    .order('is_builtin', { ascending: false })
    .order('name', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  if (builtin !== null) {
    query = query.eq('is_builtin', builtin === 'true')
  }

  if (enabled !== null) {
    query = query.eq('is_enabled', enabled === 'true')
  }

  const { data, error: dbError } = await query

  if (dbError) {
    console.error('Tools query error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 })
  }

  return NextResponse.json({ tools: data || [] })
}

// POST /api/admin/agent-tools - Create custom tool
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { name, description, category, input_schema, is_enabled } = body

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const validCategories = ['finance', 'crm', 'team', 'projects', 'knowledge', 'communications', 'goals', 'agents']
  if (category && !validCategories.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('agent_tools')
    .insert({
      name,
      description: description || null,
      category: category || 'custom',
      input_schema: input_schema || {},
      is_builtin: false,
      is_enabled: is_enabled !== false
    })
    .select()
    .single()

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json({ error: 'A tool with this name already exists' }, { status: 400 })
    }
    console.error('Create tool error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'tool_created',
    'agent_tool',
    data.id,
    { name, category },
    request
  )

  return NextResponse.json({ tool: data }, { status: 201 })
}

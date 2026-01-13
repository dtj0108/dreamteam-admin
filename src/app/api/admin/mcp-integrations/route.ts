import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/mcp-integrations - List all MCP integrations
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const enabled = searchParams.get('enabled')

  const supabase = createAdminClient()

  let query = supabase
    .from('mcp_integrations')
    .select('*')
    .order('created_at', { ascending: false })

  if (type) {
    query = query.eq('type', type)
  }

  if (enabled !== null) {
    query = query.eq('is_enabled', enabled === 'true')
  }

  const { data, error: dbError } = await query

  if (dbError) {
    console.error('MCP integrations query error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 })
  }

  return NextResponse.json({ integrations: data || [] })
}

// POST /api/admin/mcp-integrations - Create new MCP integration
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { name, description, type, config, auth_type, auth_config, is_enabled } = body

  if (!name || !type) {
    return NextResponse.json(
      { error: 'Name and type are required' },
      { status: 400 }
    )
  }

  if (!['stdio', 'sse', 'http'].includes(type)) {
    return NextResponse.json(
      { error: 'Invalid type. Must be stdio, sse, or http' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('mcp_integrations')
    .insert({
      name,
      description: description || null,
      type,
      config: config || {},
      auth_type: auth_type || 'none',
      auth_config: auth_config || {},
      is_enabled: is_enabled !== false
    })
    .select()
    .single()

  if (dbError) {
    console.error('Create MCP integration error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'mcp_integration_created',
    'mcp_integration',
    data.id,
    { name, type },
    request
  )

  return NextResponse.json({ integration: data }, { status: 201 })
}

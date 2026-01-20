import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents - List all agents
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('department_id')
    const enabled = searchParams.get('enabled')

    const supabase = createAdminClient()

    // First try without the join to see if that's the issue
    let query = supabase
      .from('ai_agents')
      .select('*')
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
      return NextResponse.json({ error: dbError.message || 'Failed to fetch agents' }, { status: 500 })
    }

    return NextResponse.json({ agents: data || [] })
  } catch (err) {
    console.error('Agents GET route error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/agents - Create a new agent
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const {
    name,
    slug,
    description,
    user_description,
    department_id,
    avatar_url,
    model = 'sonnet',
    system_prompt,
    permission_mode = 'default',
    max_turns = 10,
    is_head = false
  } = body

  // Validation
  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  if (!system_prompt || system_prompt.trim() === '') {
    return NextResponse.json({ error: 'system_prompt is required' }, { status: 400 })
  }

  if (!['sonnet', 'opus', 'haiku'].includes(model)) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 })
  }

  if (!['default', 'acceptEdits', 'bypassPermissions'].includes(permission_mode)) {
    return NextResponse.json({ error: 'Invalid permission_mode' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Generate slug if not provided
  const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { data, error: dbError } = await supabase
    .from('ai_agents')
    .insert({
      name,
      slug: finalSlug,
      description: description || null,
      user_description: user_description || null,
      department_id: department_id || null,
      avatar_url: avatar_url || null,
      model,
      system_prompt,
      permission_mode,
      max_turns,
      is_head,
      is_enabled: true,
      current_version: 1,
      config: {}
    })
    .select()
    .single()

  if (dbError) {
    console.error('Create agent error:', dbError)
    if (dbError.code === '23505') {
      return NextResponse.json({ error: 'An agent with this slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Create initial version
  await supabase
    .from('agent_versions')
    .insert({
      agent_id: data.id,
      version: 1,
      config_snapshot: {
        name: data.name,
        model: data.model,
        systemPrompt: data.system_prompt,
        maxTurns: data.max_turns,
        permissionMode: data.permission_mode,
        tools: [],
        skills: []
      },
      change_type: 'created',
      change_description: 'Agent created',
      created_by: user!.id
    })

  await logAdminAction(
    user!.id,
    'agent_created',
    'ai_agent',
    data.id,
    { name, model },
    request
  )

  return NextResponse.json({ agent: data }, { status: 201 })
}

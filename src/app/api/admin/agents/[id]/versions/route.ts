import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAgentSDKConfig } from '@/lib/agent-sdk'

// GET /api/admin/agents/[id]/versions - Get version history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('agent_versions')
    .select(`
      *,
      created_by_profile:profiles!agent_versions_created_by_fkey(id, name, email),
      published_by_profile:profiles!agent_versions_published_by_fkey(id, name, email)
    `)
    .eq('agent_id', id)
    .order('version', { ascending: false })
    .limit(limit)

  if (dbError) {
    console.error('Fetch versions error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
  }

  return NextResponse.json({ versions: data || [] })
}

// POST /api/admin/agents/[id]/versions - Create a new version (snapshot)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { change_type, change_description, change_details } = body

  // Validate change_type
  const validTypes = ['created', 'identity', 'tools', 'skills', 'prompt', 'team', 'rules', 'rollback', 'published']
  if (!change_type || !validTypes.includes(change_type)) {
    return NextResponse.json(
      { error: 'Invalid change_type' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Fetch agent with all relations to generate config snapshot
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select(`
      *,
      department:agent_departments(id, name, icon),
      tools:ai_agent_tools(
        tool_id,
        config,
        tool:agent_tools(id, name, description, category, input_schema, is_builtin)
      ),
      skills:ai_agent_skills(
        skill_id,
        skill:agent_skills(id, name, description, category, skill_content, triggers)
      ),
      delegations:agent_delegations!from_agent_id(
        id,
        to_agent_id,
        condition,
        context_template,
        to_agent:ai_agents!to_agent_id(id, name, avatar_url)
      ),
      rules:agent_rules(
        id, rule_type, rule_content, condition, priority, is_enabled
      ),
      prompt_sections:agent_prompt_sections(
        id, section_type, section_title, section_content, position, is_enabled
      )
    `)
    .eq('id', id)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Generate SDK config snapshot
  const configSnapshot = generateAgentSDKConfig(agent)

  // Get next version number
  const currentVersion = agent.current_version || 0
  const newVersion = currentVersion + 1

  // Create version record
  const { data: version, error: versionError } = await supabase
    .from('agent_versions')
    .insert({
      agent_id: id,
      version: newVersion,
      config_snapshot: configSnapshot,
      change_type,
      change_description: change_description || null,
      change_details: change_details || {},
      created_by: user!.id
    })
    .select()
    .single()

  if (versionError) {
    console.error('Create version error:', versionError)
    return NextResponse.json({ error: 'Failed to create version' }, { status: 500 })
  }

  // Update agent's current version
  await supabase
    .from('ai_agents')
    .update({ current_version: newVersion })
    .eq('id', id)

  await logAdminAction(
    user!.id,
    'agent_version_created',
    'agent_version',
    version.id,
    { agent_id: id, version: newVersion, change_type },
    request
  )

  return NextResponse.json({ version }, { status: 201 })
}

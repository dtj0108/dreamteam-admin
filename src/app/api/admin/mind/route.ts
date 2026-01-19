import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/mind - List all mind files
// Query params:
// - category: filter by category
// - content_type: filter by content type
// - enabled: filter by is_enabled (true/false)
// - search: search by name or description
// - workspace_id: filter by workspace (UUID)
// - system_only: only show system templates (true)
// - include_workspace: include workspace-specific mind files (for admin view, default false)
// - scope: filter by scope (agent, department, company)
// - department_id: filter by department (for department-scoped mind)
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const content_type = searchParams.get('content_type')
  const enabled = searchParams.get('enabled')
  const search = searchParams.get('search')
  const workspaceId = searchParams.get('workspace_id')
  const systemOnly = searchParams.get('system_only')
  const includeWorkspace = searchParams.get('include_workspace')
  const scope = searchParams.get('scope')
  const departmentId = searchParams.get('department_id')

  const supabase = createAdminClient()

  let query = supabase
    .from('agent_mind')
    .select('*')
    .order('is_system', { ascending: false }) // System mind first
    .order('scope', { ascending: false }) // company > department > agent
    .order('category', { ascending: true })
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  if (content_type) {
    query = query.eq('content_type', content_type)
  }

  if (enabled !== null) {
    query = query.eq('is_enabled', enabled === 'true')
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  if (scope) {
    query = query.eq('scope', scope)
  }

  if (departmentId) {
    query = query.eq('department_id', departmentId)
  }

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else if (systemOnly === 'true') {
    query = query.eq('is_system', true)
  } else if (includeWorkspace !== 'true') {
    query = query.eq('is_system', true)
  }

  const { data, error: dbError } = await query

  if (dbError) {
    console.error('Mind query error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch mind' }, { status: 500 })
  }

  return NextResponse.json({ mind: data || [] })
}

// POST /api/admin/mind - Create new mind file
// When created from admin panel, mind files are system templates by default (is_system=true, workspace_id=null)
// To create a workspace-specific mind file, provide workspace_id and set is_system=false
// Scope determines inheritance: 'agent' (assigned via junction), 'department' (shared by dept), 'company' (workspace-wide)
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const {
    name,
    slug,
    description,
    category,
    content,
    content_type,
    position,
    is_enabled,
    workspace_id = null,
    is_system = true,
    scope = 'agent',
    department_id = null
  } = body

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!category) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 })
  }

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const validCategories = ['finance', 'crm', 'team', 'projects', 'knowledge', 'communications', 'goals', 'shared']
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const validContentTypes = ['responsibilities', 'workflows', 'policies', 'metrics', 'examples', 'general']
  if (content_type && !validContentTypes.includes(content_type)) {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
  }

  const validScopes = ['agent', 'department', 'company']
  if (!validScopes.includes(scope)) {
    return NextResponse.json({ error: 'Invalid scope. Must be agent, department, or company' }, { status: 400 })
  }

  if (scope === 'department' && !department_id) {
    return NextResponse.json({ error: 'department_id is required when scope is department' }, { status: 400 })
  }

  if (scope !== 'department' && department_id) {
    return NextResponse.json({ error: 'department_id should only be set when scope is department' }, { status: 400 })
  }

  if (is_system && workspace_id) {
    return NextResponse.json({ error: 'System templates cannot have a workspace_id' }, { status: 400 })
  }

  if (!is_system && !workspace_id) {
    return NextResponse.json({ error: 'Workspace-specific mind files must have a workspace_id' }, { status: 400 })
  }

  if ((scope === 'company' || scope === 'department') && is_system) {
    return NextResponse.json({ error: 'Company and department scoped mind files must belong to a workspace' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('agent_mind')
    .insert({
      name,
      slug: slug || null,
      description: description || null,
      category,
      content,
      content_type: content_type || 'general',
      position: position || 0,
      is_enabled: is_enabled !== false,
      workspace_id: workspace_id || null,
      is_system,
      scope,
      department_id: department_id || null
    })
    .select()
    .single()

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json({ error: 'A mind file with this slug already exists' }, { status: 400 })
    }
    console.error('Create mind error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'mind_created',
    'agent_mind',
    data.id,
    { name, category, content_type: content_type || 'general', is_system, workspace_id, scope, department_id },
    request
  )

  return NextResponse.json({ mind: data }, { status: 201 })
}


import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/skills - List all skills
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const department_id = searchParams.get('department_id')
  const category = searchParams.get('category')
  const enabled = searchParams.get('enabled')
  const search = searchParams.get('search')

  const supabase = createAdminClient()

  let query = supabase
    .from('agent_skills')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (department_id) {
    query = query.eq('department_id', department_id)
  }

  if (category) {
    query = query.eq('category', category)
  }

  if (enabled !== null) {
    query = query.eq('is_enabled', enabled === 'true')
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data, error: dbError } = await query

  if (dbError) {
    console.error('Skills query error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 })
  }

  return NextResponse.json({ skills: data || [] })
}

// POST /api/admin/skills - Create new skill
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const {
    name,
    description,
    department_id,
    skill_content,
    category,
    triggers,
    templates,
    edge_cases,
    is_enabled
  } = body

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!skill_content) {
    return NextResponse.json({ error: 'Skill content is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('agent_skills')
    .insert({
      name,
      description: description || null,
      department_id: department_id || null,
      skill_content,
      category: category || 'general',
      triggers: triggers || [],
      templates: templates || [],
      edge_cases: edge_cases || [],
      version: 1,
      learned_rules_count: 0,
      is_system: false,
      is_enabled: is_enabled !== false
    })
    .select()
    .single()

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json({ error: 'A skill with this name already exists' }, { status: 400 })
    }
    console.error('Create skill error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Create initial version record
  await supabase
    .from('skill_versions')
    .insert({
      skill_id: data.id,
      version: 1,
      skill_content,
      triggers: triggers || [],
      templates: templates || [],
      edge_cases: edge_cases || [],
      change_type: 'created',
      change_description: 'Initial skill creation',
      created_by: user!.id
    })

  await logAdminAction(
    user!.id,
    'skill_created',
    'agent_skill',
    data.id,
    { name, category },
    request
  )

  return NextResponse.json({ skill: data }, { status: 201 })
}

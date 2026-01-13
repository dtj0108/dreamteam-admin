import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents/prompt-templates - List all prompt templates
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const department = searchParams.get('department')

  const supabase = createAdminClient()

  let query = supabase
    .from('agent_prompt_templates')
    .select('*')
    .order('name', { ascending: true })

  if (role) {
    query = query.eq('role', role)
  }

  if (department) {
    query = query.eq('department', department)
  }

  const { data, error: dbError } = await query

  if (dbError) {
    console.error('Prompt templates query error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }

  return NextResponse.json({ templates: data || [] })
}

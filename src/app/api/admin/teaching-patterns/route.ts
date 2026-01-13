import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/teaching-patterns - List patterns across all skills
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const skill_id = searchParams.get('skill_id')
  const min_occurrences = parseInt(searchParams.get('min_occurrences') || '2')
  const is_promoted = searchParams.get('is_promoted')

  const supabase = createAdminClient()

  let query = supabase
    .from('skill_teaching_patterns')
    .select('*, skill:agent_skills(id, name)')
    .gte('occurrence_count', min_occurrences)
    .order('occurrence_count', { ascending: false })

  if (skill_id) {
    query = query.eq('skill_id', skill_id)
  }

  if (is_promoted !== null) {
    query = query.eq('is_promoted', is_promoted === 'true')
  }

  const { data, error: dbError } = await query

  if (dbError) {
    console.error('Patterns query error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch patterns' }, { status: 500 })
  }

  return NextResponse.json({ patterns: data || [] })
}

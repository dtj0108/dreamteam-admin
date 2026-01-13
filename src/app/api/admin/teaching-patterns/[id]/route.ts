import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/teaching-patterns/[id] - Get single pattern with sample teachings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Get the pattern
  const { data: pattern, error: patternError } = await supabase
    .from('skill_teaching_patterns')
    .select('*, skill:agent_skills(id, name)')
    .eq('id', id)
    .single()

  if (patternError || !pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  // Get sample teachings
  let sampleTeachings: { id: string; original_output: string; corrected_output: string; created_at: string }[] = []
  if (pattern.sample_teaching_ids && pattern.sample_teaching_ids.length > 0) {
    const { data: teachings } = await supabase
      .from('skill_teachings')
      .select('id, original_output, corrected_output, created_at')
      .in('id', pattern.sample_teaching_ids.slice(0, 5))

    sampleTeachings = teachings || []
  }

  return NextResponse.json({ pattern, sampleTeachings })
}

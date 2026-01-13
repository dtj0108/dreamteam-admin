import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeTeaching } from '@/lib/teaching-analysis'

// GET /api/admin/teachings/[id] - Get teaching with analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('skill_teachings')
    .select('*, skill:agent_skills(id, name, skill_content)')
    .eq('id', id)
    .single()

  if (dbError || !data) {
    return NextResponse.json({ error: 'Teaching not found' }, { status: 404 })
  }

  return NextResponse.json({ teaching: data })
}

// POST /api/admin/teachings/[id] - Analyze or apply teaching
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { action } = body

  const supabase = createAdminClient()

  // Get the teaching
  const { data: teaching } = await supabase
    .from('skill_teachings')
    .select('*, skill:agent_skills(id, name, skill_content, learned_rules_count, version)')
    .eq('id', id)
    .single()

  if (!teaching) {
    return NextResponse.json({ error: 'Teaching not found' }, { status: 404 })
  }

  if (action === 'analyze') {
    // Trigger analysis
    if (teaching.analysis_status === 'completed') {
      return NextResponse.json({ error: 'Already analyzed' }, { status: 400 })
    }

    // Mark as analyzing
    await supabase
      .from('skill_teachings')
      .update({ analysis_status: 'analyzing' })
      .eq('id', id)

    try {
      // Call Claude to analyze the teaching
      const analysisResult = await analyzeTeaching({
        skillName: teaching.skill?.name || 'Unknown',
        skillContent: teaching.skill?.skill_content || '',
        originalOutput: teaching.original_output,
        correctedOutput: teaching.corrected_output,
        userInstruction: teaching.user_instruction
      })

      // Update with analysis result
      const { data: updated } = await supabase
        .from('skill_teachings')
        .update({
          analysis_status: 'completed',
          analysis_result: analysisResult,
          analyzed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      await logAdminAction(
        user!.id,
        'teaching_analyzed',
        'skill_teaching',
        id,
        { skill_id: teaching.skill_id },
        request
      )

      return NextResponse.json({ teaching: updated })
    } catch (err) {
      // Mark as failed
      await supabase
        .from('skill_teachings')
        .update({ analysis_status: 'failed' })
        .eq('id', id)

      console.error('Analysis error:', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Analysis failed' },
        { status: 500 }
      )
    }
  }

  if (action === 'apply') {
    // Apply analysis as learned rule
    const { rule_type, rule_content, rule_description, conditions, scope } = body

    if (!rule_type || !rule_content) {
      return NextResponse.json(
        { error: 'rule_type and rule_content are required' },
        { status: 400 }
      )
    }

    // Create the learned rule
    const { data: rule, error: ruleError } = await supabase
      .from('skill_learned_rules')
      .insert({
        skill_id: teaching.skill_id,
        teaching_id: id,
        rule_type,
        rule_content,
        rule_description: rule_description || null,
        conditions: conditions || {},
        scope: scope || 'workspace',
        workspace_id: teaching.workspace_id,
        confidence_score: teaching.analysis_result?.confidence || 0.8,
        is_active: true
      })
      .select()
      .single()

    if (ruleError) {
      console.error('Create rule error:', ruleError)
      return NextResponse.json({ error: ruleError.message }, { status: 500 })
    }

    // Update skill learned_rules_count and version
    if (teaching.skill) {
      await supabase
        .from('agent_skills')
        .update({
          learned_rules_count: (teaching.skill.learned_rules_count || 0) + 1,
          version: (teaching.skill.version || 1) + 1
        })
        .eq('id', teaching.skill_id)

      // Create version record
      const { data: skill } = await supabase
        .from('agent_skills')
        .select('skill_content, triggers, templates, edge_cases')
        .eq('id', teaching.skill_id)
        .single()

      if (skill) {
        await supabase
          .from('skill_versions')
          .insert({
            skill_id: teaching.skill_id,
            version: (teaching.skill.version || 1) + 1,
            skill_content: skill.skill_content,
            triggers: skill.triggers,
            templates: skill.templates,
            edge_cases: skill.edge_cases,
            change_type: 'learned_rule_added',
            change_description: `Added learned rule: ${rule_content.substring(0, 50)}...`,
            change_details: { rule_id: rule.id, teaching_id: id },
            created_by: user!.id
          })
      }
    }

    await logAdminAction(
      user!.id,
      'teaching_applied',
      'skill_teaching',
      id,
      { skill_id: teaching.skill_id, rule_id: rule.id },
      request
    )

    return NextResponse.json({ rule })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

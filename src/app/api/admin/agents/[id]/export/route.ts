import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAgentSDKConfig, generateAgentCodeSnippet, exportConfigAsJSON } from '@/lib/agent-sdk'

// GET /api/admin/agents/[id]/export - Export agent config
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'

  const supabase = createAdminClient()

  // Fetch agent with all relations
  const { data: agent, error: dbError } = await supabase
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

  if (dbError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const sdkConfig = generateAgentSDKConfig(agent)

  if (format === 'code') {
    // Return TypeScript code snippet
    const code = generateAgentCodeSnippet(sdkConfig)
    return new NextResponse(code, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${agent.slug || agent.name}-agent.ts"`
      }
    })
  }

  if (format === 'download') {
    // Return JSON file download
    const json = exportConfigAsJSON(sdkConfig)
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${agent.slug || agent.name}-config.json"`
      }
    })
  }

  // Default: return JSON in response
  return NextResponse.json({ config: sdkConfig })
}

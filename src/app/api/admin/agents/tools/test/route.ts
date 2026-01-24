import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runProductionTests, getProviderApiKey } from '@/lib/tool-schema-validator'
import type { AgentTool, AIProvider, AgentModel } from '@/types/agents'

// POST /api/admin/agents/tools/test - Run production tests on selected tools
export async function POST(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { tool_ids, provider = 'anthropic', model } = body as {
    tool_ids: string[]
    provider?: AIProvider
    model?: AgentModel
  }

  if (!Array.isArray(tool_ids) || tool_ids.length === 0) {
    return NextResponse.json(
      { error: 'tool_ids must be a non-empty array' },
      { status: 400 }
    )
  }

  // Fetch the tools from the database
  const supabase = createAdminClient()
  const { data: tools, error: dbError } = await supabase
    .from('agent_tools')
    .select('id, name, description, category, input_schema, is_builtin, is_enabled, created_at, updated_at')
    .in('id', tool_ids)

  if (dbError) {
    console.error('Fetch tools error:', dbError)
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    )
  }

  if (!tools || tools.length === 0) {
    return NextResponse.json(
      { error: 'No tools found with the provided IDs' },
      { status: 404 }
    )
  }

  // Get the API key from database (encrypted storage) or fall back to env var
  let apiKey = await getProviderApiKey(provider)

  // Fall back to environment variable if not configured in database
  if (!apiKey) {
    apiKey = provider === 'xai'
      ? process.env.XAI_API_KEY || null
      : process.env.ANTHROPIC_API_KEY || null
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: `${provider === 'xai' ? 'xAI' : 'Anthropic'} API key not configured. Configure it in Model Providers settings.` },
      { status: 500 }
    )
  }

  // Run the production tests
  try {
    const results = await runProductionTests(tools as AgentTool[], apiKey, provider, model)
    return NextResponse.json({ results })
  } catch (err) {
    console.error('Production test error:', err)
    return NextResponse.json(
      { error: 'Failed to run production tests' },
      { status: 500 }
    )
  }
}

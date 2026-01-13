import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Default feature flags for workspaces
const DEFAULT_FLAGS = [
  { feature_key: 'ai_capabilities', is_enabled: true },
  { feature_key: 'beta_features', is_enabled: false },
  { feature_key: 'advanced_analytics', is_enabled: false },
  { feature_key: 'api_access', is_enabled: true },
  { feature_key: 'webhook_integrations', is_enabled: true },
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Verify workspace exists
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', id)
    .single()

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Get existing flags
  const { data: existingFlags, error: flagsError } = await supabase
    .from('workspace_feature_flags')
    .select('id, feature_key, is_enabled, updated_at')
    .eq('workspace_id', id)

  if (flagsError) {
    console.error('Feature flags query error:', flagsError)
    return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 })
  }

  // Merge with defaults (show all possible flags with their current state)
  const flagsMap = new Map(existingFlags?.map(f => [f.feature_key, f]) || [])
  const flags = DEFAULT_FLAGS.map(defaultFlag => {
    const existing = flagsMap.get(defaultFlag.feature_key)
    return {
      feature_key: defaultFlag.feature_key,
      is_enabled: existing ? existing.is_enabled : defaultFlag.is_enabled,
      id: existing?.id || null,
      updated_at: existing?.updated_at || null
    }
  })

  return NextResponse.json({ feature_flags: flags })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { feature_key, is_enabled } = body

  if (!feature_key || typeof is_enabled !== 'boolean') {
    return NextResponse.json(
      { error: 'feature_key and is_enabled are required' },
      { status: 400 }
    )
  }

  // Validate feature_key
  const validKeys = DEFAULT_FLAGS.map(f => f.feature_key)
  if (!validKeys.includes(feature_key)) {
    return NextResponse.json(
      { error: `Invalid feature_key. Must be one of: ${validKeys.join(', ')}` },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Verify workspace exists
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', id)
    .single()

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Upsert the flag
  const { error: upsertError } = await supabase
    .from('workspace_feature_flags')
    .upsert({
      workspace_id: id,
      feature_key,
      is_enabled,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'workspace_id,feature_key'
    })

  if (upsertError) {
    console.error('Upsert feature flag error:', upsertError)
    return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'feature_flag_updated',
    'workspace_feature_flag',
    id,
    { feature_key, is_enabled },
    request
  )

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'

// GET /api/admin/feature-flags - List global feature flags
export async function GET() {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const { data: flags, error: dbError } = await supabase
    .from('global_feature_flags')
    .select('*')
    .order('feature_key')

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ flags })
}

// PUT /api/admin/feature-flags - Update feature flag
export async function PUT(request: NextRequest) {
  const { error, user: admin } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { feature_key, is_enabled, config } = body

  const supabase = createAdminClient()
  const { data: flag, error: dbError } = await supabase
    .from('global_feature_flags')
    .update({
      is_enabled,
      config: config || {},
      updated_at: new Date().toISOString(),
    })
    .eq('feature_key', feature_key)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    admin!.id,
    'feature_flag_updated',
    'feature_flag',
    null,
    { feature_key, is_enabled },
    request
  )

  return NextResponse.json({ flag })
}

// POST /api/admin/feature-flags - Create new feature flag
export async function POST(request: NextRequest) {
  const { error, user: admin } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { feature_key, is_enabled, description, config } = body

  const supabase = createAdminClient()
  const { data: flag, error: dbError } = await supabase
    .from('global_feature_flags')
    .insert({
      feature_key,
      is_enabled: is_enabled || false,
      description: description || '',
      config: config || {},
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    admin!.id,
    'feature_flag_created',
    'feature_flag',
    flag.id,
    { feature_key, is_enabled },
    request
  )

  return NextResponse.json({ flag })
}

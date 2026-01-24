import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { encryptApiKey } from '@/lib/encryption'
import type { ModelProviderConfig } from '@/types/model-providers'

// GET /api/admin/model-providers - List all providers
export async function GET() {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const { data: providers, error: dbError } = await supabase
    .from('model_provider_configs')
    .select('id, provider, is_enabled, config, last_validated_at, created_at, updated_at, api_key_encrypted')
    .order('provider')

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Transform to add has_api_key field and remove encrypted key
  const transformedProviders: ModelProviderConfig[] = (providers || []).map((p) => ({
    id: p.id,
    provider: p.provider,
    is_enabled: p.is_enabled,
    config: p.config || {},
    last_validated_at: p.last_validated_at,
    created_at: p.created_at,
    updated_at: p.updated_at,
    has_api_key: !!p.api_key_encrypted
  }))

  return NextResponse.json({ providers: transformedProviders })
}

// PUT /api/admin/model-providers - Update provider configuration
export async function PUT(request: NextRequest) {
  const { error, user: admin } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { provider, api_key, is_enabled, config } = body

  if (!provider) {
    return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Build update object
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (api_key !== undefined) {
    // Encrypt the API key before storing
    if (api_key === '' || api_key === null) {
      updateData.api_key_encrypted = null
      updateData.last_validated_at = null
    } else {
      updateData.api_key_encrypted = encryptApiKey(api_key)
    }
  }

  if (is_enabled !== undefined) {
    updateData.is_enabled = is_enabled
  }

  if (config !== undefined) {
    updateData.config = config
  }

  const { data: updatedProvider, error: dbError } = await supabase
    .from('model_provider_configs')
    .update(updateData)
    .eq('provider', provider)
    .select('id, provider, is_enabled, config, last_validated_at, created_at, updated_at, api_key_encrypted')
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Log the action (don't include the API key in logs)
  await logAdminAction(
    admin!.id,
    'model_provider_updated',
    'model_provider',
    updatedProvider.id,
    {
      provider,
      is_enabled: is_enabled,
      api_key_updated: api_key !== undefined
    },
    request
  )

  // Transform response
  const response: ModelProviderConfig = {
    id: updatedProvider.id,
    provider: updatedProvider.provider,
    is_enabled: updatedProvider.is_enabled,
    config: updatedProvider.config || {},
    last_validated_at: updatedProvider.last_validated_at,
    created_at: updatedProvider.created_at,
    updated_at: updatedProvider.updated_at,
    has_api_key: !!updatedProvider.api_key_encrypted
  }

  return NextResponse.json({ provider: response })
}

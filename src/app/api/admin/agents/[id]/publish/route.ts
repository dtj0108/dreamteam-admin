import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/agents/[id]/publish - Publish a version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { version } = body

  if (version === undefined || typeof version !== 'number') {
    return NextResponse.json({ error: 'version number is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify agent exists
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Verify version exists
  const { data: versionData } = await supabase
    .from('agent_versions')
    .select('id, version, is_published')
    .eq('agent_id', id)
    .eq('version', version)
    .single()

  if (!versionData) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  // Unpublish any currently published version
  await supabase
    .from('agent_versions')
    .update({ is_published: false })
    .eq('agent_id', id)
    .eq('is_published', true)

  // Publish the specified version
  const { data: publishedVersion, error: publishError } = await supabase
    .from('agent_versions')
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
      published_by: user!.id
    })
    .eq('id', versionData.id)
    .select()
    .single()

  if (publishError) {
    console.error('Publish version error:', publishError)
    return NextResponse.json({ error: 'Failed to publish version' }, { status: 500 })
  }

  // Update agent's published version
  await supabase
    .from('ai_agents')
    .update({ published_version: version })
    .eq('id', id)

  await logAdminAction(
    user!.id,
    'agent_version_published',
    'agent_version',
    publishedVersion.id,
    { agent_id: id, version },
    request
  )

  return NextResponse.json({ version: publishedVersion })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { processUnprocessedEpisodes } from '@/lib/memory-extraction'

// POST /api/admin/memory/process - Process unprocessed episodes
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { workspace_id, limit = 10 } = body

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  try {
    const result = await processUnprocessedEpisodes(workspace_id, limit)

    await logAdminAction(
      user!.id,
      'memory_episodes_processed',
      'workspace',
      workspace_id,
      result,
      request
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('Failed to process episodes:', err)
    return NextResponse.json({ error: 'Failed to process episodes' }, { status: 500 })
  }
}

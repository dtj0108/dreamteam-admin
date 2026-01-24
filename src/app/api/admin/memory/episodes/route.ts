import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { listEpisodes } from '@/lib/memory-service'
import type { EpisodeType } from '@/types/memory'

// GET /api/admin/memory/episodes - List episodes
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const episodeType = searchParams.get('episode_type') as EpisodeType | null
  const userId = searchParams.get('user_id')
  const agentId = searchParams.get('agent_id')
  const isProcessed = searchParams.get('is_processed')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  try {
    const result = await listEpisodes(workspaceId, {
      episodeType: episodeType || undefined,
      userId: userId || undefined,
      agentId: agentId || undefined,
      isProcessed: isProcessed !== null ? isProcessed === 'true' : undefined,
      limit,
      offset
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Failed to list episodes:', err)
    return NextResponse.json({ error: 'Failed to list episodes' }, { status: 500 })
  }
}

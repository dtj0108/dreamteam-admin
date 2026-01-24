import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { recallMemories } from '@/lib/memory-service'

// POST /api/admin/memory/search - Semantic search
export async function POST(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { workspace_id, query, user_id, limit = 20 } = body

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  try {
    const result = await recallMemories(query, {
      workspaceId: workspace_id,
      userId: user_id
    }, {
      maxResults: limit,
      similarityThreshold: 0.5 // Lower threshold for admin search
    })

    return NextResponse.json({
      facts: result.facts,
      summaries: result.summaries
    })
  } catch (err) {
    console.error('Failed to search memories:', err)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { consolidateMemories, decayMemories } from '@/lib/memory-consolidation'

// POST /api/admin/memory/consolidate - Consolidate facts into summaries
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { workspace_id, include_decay = false } = body

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  try {
    // Consolidate facts into summaries
    const consolidationResult = await consolidateMemories(workspace_id)

    // Optionally run decay
    let decayResult = null
    if (include_decay) {
      decayResult = await decayMemories(workspace_id)
    }

    await logAdminAction(
      user!.id,
      'memory_consolidated',
      'workspace',
      workspace_id,
      { ...consolidationResult, decayResult },
      request
    )

    return NextResponse.json({
      ...consolidationResult,
      decayResult
    })
  } catch (err) {
    console.error('Failed to consolidate memories:', err)
    return NextResponse.json({ error: 'Failed to consolidate' }, { status: 500 })
  }
}

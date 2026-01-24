import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { getMemoryStats } from '@/lib/memory-service'

// GET /api/admin/memory/stats - Get memory statistics
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  try {
    const stats = await getMemoryStats(workspaceId)
    return NextResponse.json(stats)
  } catch (err) {
    console.error('Failed to get memory stats:', err)
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
  }
}

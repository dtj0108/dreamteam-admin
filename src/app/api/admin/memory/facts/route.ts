import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { listFacts, rememberFact } from '@/lib/memory-service'
import type { FactType, MemoryScope } from '@/types/memory'

// GET /api/admin/memory/facts - List facts
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const factType = searchParams.get('fact_type') as FactType | null
  const scope = searchParams.get('scope') as MemoryScope | null
  const userId = searchParams.get('user_id')
  const agentId = searchParams.get('agent_id')
  const isActive = searchParams.get('is_active')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  try {
    const result = await listFacts(workspaceId, {
      factType: factType || undefined,
      scope: scope || undefined,
      userId: userId || undefined,
      agentId: agentId || undefined,
      isActive: isActive !== null ? isActive === 'true' : undefined,
      limit,
      offset
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Failed to list facts:', err)
    return NextResponse.json({ error: 'Failed to list facts' }, { status: 500 })
  }
}

// POST /api/admin/memory/facts - Create a fact
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const {
    workspace_id,
    content,
    fact_type,
    scope = 'workspace',
    user_id,
    agent_id,
    importance = 0.7
  } = body

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  if (!fact_type) {
    return NextResponse.json({ error: 'fact_type is required' }, { status: 400 })
  }

  try {
    const fact = await rememberFact(content, fact_type, {
      workspaceId: workspace_id,
      userId: user_id,
      agentId: agent_id
    }, {
      scope,
      importance,
      confidence: 1.0
    })

    await logAdminAction(
      user!.id,
      'memory_fact_created',
      'agent_memory_fact',
      fact.id,
      { workspace_id, fact_type, scope },
      request
    )

    return NextResponse.json({ fact }, { status: 201 })
  } catch (err) {
    console.error('Failed to create fact:', err)
    return NextResponse.json({ error: 'Failed to create fact' }, { status: 500 })
  }
}

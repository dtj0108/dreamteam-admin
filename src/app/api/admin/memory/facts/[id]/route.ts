import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { getFact, updateFact, deleteFact } from '@/lib/memory-service'
import type { FactType, MemoryScope } from '@/types/memory'

// GET /api/admin/memory/facts/[id] - Get a specific fact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params

  try {
    const fact = await getFact(id)

    if (!fact) {
      return NextResponse.json({ error: 'Fact not found' }, { status: 404 })
    }

    return NextResponse.json({ fact })
  } catch (err) {
    console.error('Failed to get fact:', err)
    return NextResponse.json({ error: 'Failed to get fact' }, { status: 500 })
  }
}

// PATCH /api/admin/memory/facts/[id] - Update a fact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const updates: Partial<{
    content: string
    fact_type: FactType
    importance: number
    scope: MemoryScope
    is_active: boolean
  }> = {}

  if (body.content !== undefined) updates.content = body.content
  if (body.fact_type !== undefined) updates.fact_type = body.fact_type
  if (body.importance !== undefined) updates.importance = body.importance
  if (body.scope !== undefined) updates.scope = body.scope
  if (body.is_active !== undefined) updates.is_active = body.is_active

  try {
    const fact = await updateFact(id, updates)

    await logAdminAction(
      user!.id,
      'memory_fact_updated',
      'agent_memory_fact',
      id,
      updates,
      request
    )

    return NextResponse.json({ fact })
  } catch (err) {
    console.error('Failed to update fact:', err)
    return NextResponse.json({ error: 'Failed to update fact' }, { status: 500 })
  }
}

// DELETE /api/admin/memory/facts/[id] - Delete a fact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params

  try {
    await deleteFact(id)

    await logAdminAction(
      user!.id,
      'memory_fact_deleted',
      'agent_memory_fact',
      id,
      {},
      request
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to delete fact:', err)
    return NextResponse.json({ error: 'Failed to delete fact' }, { status: 500 })
  }
}

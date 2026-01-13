import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/admin/agents/[id]/prompt-sections/[sectionId] - Update a section
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id, sectionId } = await params
  const body = await request.json()

  const allowedFields = ['section_type', 'section_title', 'section_content', 'position', 'is_enabled']
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  // Validate section_type if provided
  if (updates.section_type) {
    const validTypes = ['identity', 'personality', 'capabilities', 'constraints', 'examples', 'custom']
    if (!validTypes.includes(updates.section_type as string)) {
      return NextResponse.json(
        { error: 'Invalid section_type' },
        { status: 400 }
      )
    }
  }

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('agent_prompt_sections')
    .update(updates)
    .eq('id', sectionId)
    .eq('agent_id', id)
    .select()
    .single()

  if (dbError) {
    console.error('Update prompt section error:', dbError)
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  await logAdminAction(
    user!.id,
    'agent_prompt_section_updated',
    'agent_prompt_section',
    sectionId,
    { agent_id: id, ...updates },
    request
  )

  return NextResponse.json({ section: data })
}

// DELETE /api/admin/agents/[id]/prompt-sections/[sectionId] - Delete a section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id, sectionId } = await params
  const supabase = createAdminClient()

  // Get section before deletion
  const { data: section } = await supabase
    .from('agent_prompt_sections')
    .select('section_type, section_title')
    .eq('id', sectionId)
    .eq('agent_id', id)
    .single()

  const { error: dbError } = await supabase
    .from('agent_prompt_sections')
    .delete()
    .eq('id', sectionId)
    .eq('agent_id', id)

  if (dbError) {
    console.error('Delete prompt section error:', dbError)
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'agent_prompt_section_deleted',
    'agent_prompt_section',
    sectionId,
    { agent_id: id, section_type: section?.section_type, section_title: section?.section_title },
    request
  )

  return NextResponse.json({ success: true })
}

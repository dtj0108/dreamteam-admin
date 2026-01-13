import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Verify workspace exists
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', id)
    .single()

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Get all members with profile info
  const { data: members, error: membersError } = await supabase
    .from('workspace_members')
    .select(`
      id,
      role,
      display_name,
      status,
      status_text,
      allowed_products,
      joined_at,
      profile:profiles(
        id,
        email,
        name,
        avatar_url
      )
    `)
    .eq('workspace_id', id)
    .order('joined_at', { ascending: true })

  if (membersError) {
    console.error('Members query error:', membersError)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  return NextResponse.json({ members: members || [] })
}

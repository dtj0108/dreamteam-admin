import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export interface WorkspaceUser {
  id: string
  email: string
  role: 'owner' | 'admin' | 'member'
}

export async function requireWorkspaceMember(workspaceId: string): Promise<{
  error: NextResponse | null
  user: WorkspaceUser | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null
    }
  }

  const adminClient = createAdminClient()
  
  // Check if user is a member of this workspace
  const { data: membership } = await adminClient
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return {
      error: NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 }),
      user: null
    }
  }

  return {
    error: null,
    user: {
      id: user.id,
      email: user.email || '',
      role: membership.role as 'owner' | 'admin' | 'member'
    }
  }
}

export async function requireWorkspaceAdmin(workspaceId: string): Promise<{
  error: NextResponse | null
  user: WorkspaceUser | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null
    }
  }

  const adminClient = createAdminClient()
  
  // Check if user is an admin or owner of this workspace
  const { data: membership } = await adminClient
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role === 'member') {
    return {
      error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
      user: null
    }
  }

  return {
    error: null,
    user: {
      id: user.id,
      email: user.email || '',
      role: membership.role as 'owner' | 'admin' | 'member'
    }
  }
}


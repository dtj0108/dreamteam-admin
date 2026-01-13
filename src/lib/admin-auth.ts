import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { Profile } from '@/types/database'

export interface AdminUser {
  id: string
  email: string
  is_superadmin: boolean
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function requireSuperadmin(): Promise<{
  error: NextResponse | null
  user: AdminUser | null
}> {
  const session = await getSession()

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null
    }
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, is_superadmin')
    .eq('id', session.user.id)
    .single()

  if (!profile?.is_superadmin) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null
    }
  }

  return { error: null, user: profile as AdminUser }
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {},
  request?: Request
) {
  const supabase = createAdminClient()

  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
    ip_address: request?.headers.get('x-forwarded-for') || null,
    user_agent: request?.headers.get('user-agent') || null,
  })
}

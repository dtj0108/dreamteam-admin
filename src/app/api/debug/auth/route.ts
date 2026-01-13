import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({
      authenticated: false,
      error: authError?.message || 'No user session'
    })
  }

  const adminClient = createAdminClient()
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, email, is_superadmin, name')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email
    },
    profile: profile || null,
    profileError: profileError?.message || null
  })
}

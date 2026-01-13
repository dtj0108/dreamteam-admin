import { NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  try {
    const body = await request.json()
    const { email, is_superadmin = false } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)

    if (inviteError) {
      console.error('Invite error:', inviteError)
      return NextResponse.json(
        { error: inviteError.message },
        { status: 500 }
      )
    }

    // Create profile for the invited user
    if (inviteData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: inviteData.user.id,
          email: email,
          is_superadmin: is_superadmin,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // User was invited but profile creation failed
        // We'll still return success since they can log in
      }
    }

    // Log the admin action
    await logAdminAction(
      user!.id,
      'invite_user',
      'user',
      inviteData.user?.id || null,
      { email, is_superadmin },
      request
    )

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      user: inviteData.user
    })

  } catch (err) {
    console.error('Invite user error:', err)
    return NextResponse.json(
      { error: 'Failed to invite user' },
      { status: 500 }
    )
  }
}

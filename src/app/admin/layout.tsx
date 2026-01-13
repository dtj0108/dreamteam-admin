import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

interface ProfileData {
  is_superadmin: boolean
  name: string | null
  email: string
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use admin client to check superadmin status (bypasses RLS)
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('profiles')
    .select('is_superadmin, name, email')
    .eq('id', user.id)
    .single()

  const profile = data as ProfileData | null

  if (!profile?.is_superadmin) {
    redirect('/unauthorized')
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar user={{ email: user.email!, name: profile.name }} />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

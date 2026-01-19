import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/plans - Fetch all plans from database
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const { data: plans, error: dbError } = await supabase
    .from('plans')
    .select('id, name, slug, description, price_monthly')
    .order('price_monthly', { ascending: true })

  if (dbError) {
    console.error('Plans query error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ plans: plans || [] })
}

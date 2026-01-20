import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getWorkspaceDeployedTeam,
  updateWorkspaceCustomizations,
  undeployWorkspaceTeam,
} from '@/lib/deployment'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/admin/workspaces/[id]/deployed-team - Get workspace's deployed team config
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { id: workspaceId } = await context.params
    const supabase = createAdminClient()

    // Verify workspace exists
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', workspaceId)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Get deployed team with source team info
    const { data: deployment, error: deployError } = await supabase
      .from('workspace_deployed_teams')
      .select(`
        *,
        source_team:teams(id, name, slug, current_version),
        deployed_by_profile:profiles!workspace_deployed_teams_deployed_by_fkey(id, email, full_name),
        last_customized_by_profile:profiles!workspace_deployed_teams_last_customized_by_fkey(id, email, full_name)
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .single()

    if (deployError) {
      if (deployError.code === 'PGRST116') {
        return NextResponse.json({
          workspace,
          deployment: null,
          message: 'No active team deployment for this workspace',
        })
      }
      return NextResponse.json({ error: deployError.message }, { status: 500 })
    }

    // Check if update available
    const sourceTeam = deployment.source_team as { current_version: number } | null
    const updateAvailable =
      sourceTeam && deployment.source_version < sourceTeam.current_version

    return NextResponse.json({
      workspace,
      deployment,
      update_available: updateAvailable,
      latest_version: sourceTeam?.current_version || deployment.source_version,
    })
  } catch (err) {
    console.error('Workspace deployed-team GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/workspaces/[id]/deployed-team - Update workspace customizations
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id: workspaceId } = await context.params
    const body = await request.json()
    const { customizations } = body

    if (!customizations) {
      return NextResponse.json(
        { error: 'customizations object is required' },
        { status: 400 }
      )
    }

    const deployment = await updateWorkspaceCustomizations(
      workspaceId,
      customizations,
      user!.id
    )

    await logAdminAction(
      user!.id,
      'workspace_team_customized',
      'workspace',
      workspaceId,
      { customizations },
      request
    )

    return NextResponse.json({ deployment })
  } catch (err) {
    console.error('Workspace deployed-team PATCH error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/workspaces/[id]/deployed-team - Undeploy team from workspace
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id: workspaceId } = await context.params

    // Verify there's an active deployment
    const existing = await getWorkspaceDeployedTeam(workspaceId)
    if (!existing) {
      return NextResponse.json(
        { error: 'No active deployment found for this workspace' },
        { status: 404 }
      )
    }

    await undeployWorkspaceTeam(workspaceId)

    await logAdminAction(
      user!.id,
      'workspace_team_undeployed',
      'workspace',
      workspaceId,
      { team_id: existing.source_team_id },
      request
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Workspace deployed-team DELETE error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

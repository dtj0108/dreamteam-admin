// Auto-deploy hook for workspace creation
import { createAdminClient } from '@/lib/supabase/admin'
import { deployTeamToWorkspaces } from '@/lib/deployment'

/**
 * Auto-deploy a team to a workspace based on its plan.
 * Called when a workspace is created with a plan that has a team assigned.
 */
export async function autoDeployTeamForWorkspace(
  workspaceId: string,
  planId: string,
  createdByUserId?: string
): Promise<{ deployed: boolean; teamId?: string; error?: string }> {
  const supabase = createAdminClient()

  // Get the plan to find the associated team
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('team_id')
    .eq('id', planId)
    .single()

  if (planError || !plan) {
    return {
      deployed: false,
      error: `Plan not found: ${planId}`,
    }
  }

  // If the plan has no team, nothing to deploy
  if (!plan.team_id) {
    return {
      deployed: false,
      error: 'Plan has no team assigned',
    }
  }

  // Deploy the team to the workspace
  try {
    const result = await deployTeamToWorkspaces(
      plan.team_id,
      [workspaceId],
      createdByUserId || 'system'
    )

    if (result.success.includes(workspaceId)) {
      return {
        deployed: true,
        teamId: plan.team_id,
      }
    } else {
      const failure = result.failed.find((f) => f.workspaceId === workspaceId)
      return {
        deployed: false,
        teamId: plan.team_id,
        error: failure?.error || 'Unknown deployment error',
      }
    }
  } catch (error) {
    return {
      deployed: false,
      teamId: plan.team_id,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Auto-deploy teams to all workspaces for a given plan.
 * Useful for bulk operations when updating a plan's team.
 */
export async function autoDeployTeamToAllPlanWorkspaces(
  planId: string,
  deployedByUserId: string
): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
  const supabase = createAdminClient()

  // Get the plan's team
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('team_id')
    .eq('id', planId)
    .single()

  if (planError || !plan || !plan.team_id) {
    return {
      successCount: 0,
      failureCount: 0,
      errors: [planError?.message || 'Plan not found or has no team'],
    }
  }

  // Get all workspaces with this plan
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('plan_id', planId)

  if (workspacesError || !workspaces || workspaces.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      errors: workspacesError ? [workspacesError.message] : ['No workspaces found for plan'],
    }
  }

  // Deploy to all workspaces
  const workspaceIds = workspaces.map((w) => w.id)
  const result = await deployTeamToWorkspaces(plan.team_id, workspaceIds, deployedByUserId)

  return {
    successCount: result.success.length,
    failureCount: result.failed.length,
    errors: result.failed.map((f) => `${f.workspaceId}: ${f.error}`),
  }
}

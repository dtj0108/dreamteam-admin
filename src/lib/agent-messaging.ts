// Agent Messaging - Send notifications for scheduled task completions
// Ported from financebro-1/apps/finance/src/lib/agent-messaging.ts

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get all admin profile IDs for a workspace (owners + admins).
 * Used as a fallback when no specific user is set to receive notifications.
 */
export async function getWorkspaceAdminIds(
  workspaceId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  const { data: admins } = await supabase
    .from('workspace_members')
    .select('profile_id')
    .eq('workspace_id', workspaceId)
    .in('role', ['owner', 'admin'])

  return (admins || []).map(a => a.profile_id).filter(Boolean)
}

/**
 * Get the workspace owner's profile ID.
 * This is the most reliable final fallback - every workspace must have an owner.
 */
export async function getWorkspaceOwnerId(
  workspaceId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: owner } = await supabase
    .from('workspace_members')
    .select('profile_id')
    .eq('workspace_id', workspaceId)
    .eq('role', 'owner')
    .limit(1)
    .single()

  return owner?.profile_id || null
}

/**
 * Format a scheduled task completion message for delivery.
 */
export function formatTaskCompletionMessage(params: {
  scheduleName: string
  taskPrompt: string
  status: 'completed' | 'failed'
  resultText: string
  durationMs?: number
}): string {
  const { scheduleName, taskPrompt, status, resultText, durationMs } = params

  if (status === 'completed') {
    const truncatedResult = resultText.length > 500
      ? `${resultText.slice(0, 500)}...`
      : resultText
    const durationStr = durationMs
      ? `\n\n_Completed in ${(durationMs / 1000).toFixed(1)}s_`
      : ''

    return `**Scheduled Task Completed**\n\nI finished running your scheduled task: **${scheduleName}**\n\n**Task:** ${taskPrompt}\n\n**Result:** ${truncatedResult}${durationStr}`
  }

  return `**Scheduled Task Failed**\n\nI encountered an error running: **${scheduleName}**\n\n**Task:** ${taskPrompt}\n\n**Error:** ${resultText}`
}

interface SendAgentChatMessageParams {
  agentId: string           // agents.id (local agent ID)
  userId: string            // User's profile_id
  workspaceId: string
  content: string
  supabase: SupabaseClient
}

interface SendAgentChatMessageResult {
  success: boolean
  messageId?: string
  conversationId?: string
  error?: string
}

/**
 * Send a message as an agent to a user's agent chat conversation.
 * The message appears in the agent's chat page (under Agents section).
 *
 * This finds or creates an agent_conversations row for the user+agent,
 * then inserts a message into agent_messages with role='assistant'.
 */
export async function sendAgentChatMessage(
  params: SendAgentChatMessageParams
): Promise<SendAgentChatMessageResult> {
  const { agentId, userId, workspaceId, content, supabase } = params

  try {
    // 1. Find or create conversation for this user+agent
    let conversationId: string

    // Get the most recent conversation for this agent+user pair
    const { data: existingConvos } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(1)

    const existing = existingConvos?.[0] || null

    if (existing) {
      conversationId = existing.id
    } else {
      // Create new conversation
      const { data: newConvo, error: createError } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          user_id: userId,
          workspace_id: workspaceId,
          title: 'Scheduled Tasks',
        })
        .select('id')
        .single()

      if (createError) {
        console.error('[AgentMessaging] Failed to create conversation:', createError)
        return {
          success: false,
          error: `Failed to create conversation: ${createError.message}`,
        }
      }
      conversationId = newConvo.id
    }

    // 2. Insert the message as role='assistant'
    const { data: message, error: msgError } = await supabase
      .from('agent_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content,
        parts: [{ type: 'text', text: content }],
      })
      .select('id')
      .single()

    if (msgError) {
      console.error('[AgentMessaging] Failed to insert message:', msgError)
      return {
        success: false,
        error: `Failed to insert message: ${msgError.message}`,
      }
    }

    // 3. Update conversation's updated_at
    await supabase
      .from('agent_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    console.log(
      `[AgentMessaging] Sent chat message from agent ${agentId} to user ${userId} in conversation ${conversationId}`
    )

    return {
      success: true,
      messageId: message.id,
      conversationId,
    }
  } catch (error) {
    console.error('[AgentMessaging] Unexpected error sending chat message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

interface LocalAgentInfo {
  id: string
  reports_to: string | null
  workspace_id: string
}

/**
 * Find the local workspace agent that corresponds to a global ai_agent.
 * Returns the local agent's ID, reports_to, and workspace_id.
 */
export async function findLocalAgent(
  aiAgentId: string,
  workspaceId: string | null,
  supabase: SupabaseClient
): Promise<LocalAgentInfo | null> {
  // Build query - if we have a workspace ID, use it; otherwise get any matching agent
  let query = supabase
    .from('agents')
    .select('id, reports_to, workspace_id')
    .eq('ai_agent_id', aiAgentId)
    .limit(1)

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  const { data: agent, error } = await query.single()

  if (error || !agent) {
    console.log(`[AgentMessaging] No local agent found for ai_agent_id ${aiAgentId}${workspaceId ? ` in workspace ${workspaceId}` : ''}`)
    return null
  }

  return agent as LocalAgentInfo
}

/**
 * Resolve notification recipients for a scheduled task execution.
 * Uses the cascade: reports_to → schedule creator → workspace admins → workspace owner
 */
export async function resolveNotificationRecipients(params: {
  localAgent: LocalAgentInfo | null
  scheduleCreatedBy: string | null
  workspaceId: string
  supabase: SupabaseClient
}): Promise<string[]> {
  const { localAgent, scheduleCreatedBy, workspaceId, supabase } = params
  const recipients: string[] = []

  // 1. Try reports_to from local agent
  if (localAgent?.reports_to) {
    recipients.push(localAgent.reports_to)
    console.log(`[AgentMessaging] Using reports_to: ${localAgent.reports_to}`)
    return recipients
  }

  // 2. Fall back to schedule creator
  if (scheduleCreatedBy) {
    recipients.push(scheduleCreatedBy)
    console.log(`[AgentMessaging] Using schedule creator: ${scheduleCreatedBy}`)
    return recipients
  }

  // 3. Fall back to workspace admins
  const adminIds = await getWorkspaceAdminIds(workspaceId, supabase)
  if (adminIds.length > 0) {
    console.log(`[AgentMessaging] Using workspace admins: ${adminIds.join(', ')}`)
    return adminIds
  }

  // 4. Final fallback to workspace owner
  const ownerId = await getWorkspaceOwnerId(workspaceId, supabase)
  if (ownerId) {
    recipients.push(ownerId)
    console.log(`[AgentMessaging] Using workspace owner: ${ownerId}`)
    return recipients
  }

  console.log(`[AgentMessaging] No recipients found for workspace ${workspaceId}`)
  return []
}

interface SendScheduledTaskNotificationParams {
  executionId: string
  aiAgentId: string
  scheduleId: string
  scheduleName: string
  taskPrompt: string
  status: 'completed' | 'failed'
  resultText: string
  durationMs?: number
  workspaceId: string | null
  scheduleCreatedBy: string | null
  supabase: SupabaseClient
}

interface SendScheduledTaskNotificationResult {
  success: boolean
  recipientCount: number
  errors: string[]
}

/**
 * Send a notification for a completed/failed scheduled task.
 * This is the main entry point for scheduled task notifications.
 */
export async function sendScheduledTaskNotification(
  params: SendScheduledTaskNotificationParams
): Promise<SendScheduledTaskNotificationResult> {
  const {
    aiAgentId,
    scheduleName,
    taskPrompt,
    status,
    resultText,
    durationMs,
    workspaceId,
    scheduleCreatedBy,
    supabase,
  } = params

  const errors: string[] = []

  // If no workspace ID, we can't send notifications
  if (!workspaceId) {
    console.log('[AgentMessaging] No workspace ID provided, skipping notification')
    return { success: false, recipientCount: 0, errors: ['No workspace ID provided'] }
  }

  // Find the local agent for this workspace
  const localAgent = await findLocalAgent(aiAgentId, workspaceId, supabase)

  if (!localAgent) {
    console.log(`[AgentMessaging] No local agent found for ai_agent ${aiAgentId} in workspace ${workspaceId}, skipping notification`)
    return { success: false, recipientCount: 0, errors: ['No local agent found in workspace'] }
  }

  // Resolve recipients
  const recipients = await resolveNotificationRecipients({
    localAgent,
    scheduleCreatedBy,
    workspaceId,
    supabase,
  })

  if (recipients.length === 0) {
    return { success: false, recipientCount: 0, errors: ['No recipients found'] }
  }

  // Format the message
  const content = formatTaskCompletionMessage({
    scheduleName,
    taskPrompt,
    status,
    resultText,
    durationMs,
  })

  // Send to each recipient
  let successCount = 0
  for (const recipientId of recipients) {
    const result = await sendAgentChatMessage({
      agentId: localAgent.id,
      userId: recipientId,
      workspaceId,
      content,
      supabase,
    })

    if (result.success) {
      successCount++
    } else if (result.error) {
      errors.push(`Failed to notify ${recipientId}: ${result.error}`)
    }
  }

  console.log(`[AgentMessaging] Sent scheduled task notification to ${successCount}/${recipients.length} recipients`)

  return {
    success: successCount > 0,
    recipientCount: successCount,
    errors,
  }
}

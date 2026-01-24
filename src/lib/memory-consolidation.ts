// Memory Consolidation Service - Summarize facts and manage memory lifecycle
// Handles creating summaries from related facts and decaying unused memories

import { createAdminClient } from './supabase/admin'
import { generateText } from 'ai'
import { anthropic } from './ai-sdk-provider'
import { generateEmbedding } from './embeddings'
import type { MemoryFact, SummaryCategory, GeneratedSummary } from '@/types/memory'

const SUMMARY_GENERATION_PROMPT = `You are a memory consolidation assistant. Given a collection of individual facts, create a coherent summary that captures the essential information.

The summary should:
1. Synthesize related information into a cohesive narrative
2. Preserve important details while removing redundancy
3. Be written in a clear, factual style
4. Be useful as context for future conversations

Facts to consolidate:
{facts}

Generate a summary with:
- title: A brief title for this summary (5-10 words)
- content: The consolidated summary (2-4 paragraphs)

Output as JSON:
{
  "title": "Brief descriptive title",
  "content": "The consolidated summary..."
}
`

/**
 * Consolidate related facts into summaries for a workspace
 * Should be run as a scheduled job (e.g., daily)
 */
export async function consolidateMemories(workspaceId: string): Promise<{
  summariesCreated: number
  summariesUpdated: number
}> {
  const supabase = createAdminClient()

  // Get active facts that haven't been recently consolidated
  const { data: facts } = await supabase
    .from('agent_memory_facts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .is('superseded_by', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!facts || facts.length < 5) {
    return { summariesCreated: 0, summariesUpdated: 0 }
  }

  // Group facts by category (fact_type + scope + user_id)
  const groups = groupFactsByCategory(facts)

  let summariesCreated = 0
  let summariesUpdated = 0

  for (const [key, groupFacts] of Object.entries(groups)) {
    if (groupFacts.length < 3) continue

    const [factType, scope, userId] = key.split(':')
    const category = mapFactTypeToSummaryCategory(factType)

    try {
      // Generate summary using LLM
      const summary = await generateSummary(groupFacts, category)

      if (!summary) continue

      // Generate embedding for the summary
      const embedding = await generateEmbedding(summary.content)

      // Check if summary already exists for this scope/category/user
      const { data: existingSummary } = await supabase
        .from('agent_memory_summaries')
        .select('id, consolidation_count, source_fact_ids')
        .eq('workspace_id', workspaceId)
        .eq('scope', scope)
        .eq('category', category)
        .eq('user_id', userId || null)
        .maybeSingle()

      const factIds = groupFacts.map(f => f.id)

      if (existingSummary) {
        // Update existing summary
        const newSourceIds = [...new Set([...existingSummary.source_fact_ids, ...factIds])]

        await supabase
          .from('agent_memory_summaries')
          .update({
            title: summary.title,
            content: summary.content,
            embedding,
            source_fact_ids: newSourceIds,
            fact_count: newSourceIds.length,
            last_consolidated_at: new Date().toISOString(),
            consolidation_count: existingSummary.consolidation_count + 1
          })
          .eq('id', existingSummary.id)

        summariesUpdated++
      } else {
        // Create new summary
        await supabase
          .from('agent_memory_summaries')
          .insert({
            workspace_id: workspaceId,
            scope,
            user_id: userId || null,
            agent_id: null,
            category,
            title: summary.title,
            content: summary.content,
            embedding,
            source_fact_ids: factIds,
            fact_count: factIds.length,
            last_consolidated_at: new Date().toISOString(),
            consolidation_count: 1
          })

        summariesCreated++
      }
    } catch (error) {
      console.error(`Failed to consolidate ${key}:`, error)
      continue
    }
  }

  return { summariesCreated, summariesUpdated }
}

/**
 * Decay unused memories over time
 * Should be run as a scheduled job (e.g., weekly)
 */
export async function decayMemories(
  workspaceId: string,
  daysThreshold: number = 30,
  decayRate: number = 0.9
): Promise<{ affected: number; deactivated: number }> {
  const supabase = createAdminClient()

  // Use the database function for efficient decay
  const { data, error } = await supabase.rpc('decay_unused_memories', {
    p_workspace_id: workspaceId,
    days_threshold: daysThreshold,
    decay_rate: decayRate
  })

  if (error) {
    console.error('Failed to decay memories:', error)
    return { affected: 0, deactivated: 0 }
  }

  // Count deactivated facts
  const { count: deactivated } = await supabase
    .from('agent_memory_facts')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_active', false)
    .gt('updated_at', new Date(Date.now() - 60000).toISOString()) // Updated in last minute

  return {
    affected: data || 0,
    deactivated: deactivated || 0
  }
}

/**
 * Archive old episodes to reduce storage
 * Should be run as a scheduled job (e.g., monthly)
 */
export async function archiveOldEpisodes(
  workspaceId: string,
  daysOld: number = 90
): Promise<number> {
  const supabase = createAdminClient()

  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString()

  // Delete old processed episodes (their facts are already extracted)
  const { error, count } = await supabase
    .from('agent_memory_episodes')
    .delete({ count: 'exact' })
    .eq('workspace_id', workspaceId)
    .eq('is_processed', true)
    .lt('created_at', cutoffDate)

  if (error) {
    console.error('Failed to archive old episodes:', error)
    return 0
  }

  return count || 0
}

/**
 * Group facts by category for consolidation
 */
function groupFactsByCategory(facts: MemoryFact[]): Record<string, MemoryFact[]> {
  const groups: Record<string, MemoryFact[]> = {}

  for (const fact of facts) {
    const key = `${fact.fact_type}:${fact.scope}:${fact.user_id || ''}`

    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(fact)
  }

  return groups
}

/**
 * Map fact types to summary categories
 */
function mapFactTypeToSummaryCategory(factType: string): SummaryCategory {
  switch (factType) {
    case 'preference':
      return 'user_profile'
    case 'context':
      return 'project_context'
    case 'knowledge':
      return 'domain_knowledge'
    case 'relationship':
      return 'workflow'
    default:
      return 'project_context'
  }
}

/**
 * Generate a summary from a collection of facts using LLM
 */
async function generateSummary(
  facts: MemoryFact[],
  category: SummaryCategory
): Promise<GeneratedSummary | null> {
  const factsText = facts
    .map((f, i) => `${i + 1}. [${f.fact_type}] ${f.content}`)
    .join('\n')

  const prompt = SUMMARY_GENERATION_PROMPT.replace('{facts}', factsText)

  try {
    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      prompt,
      maxTokens: 1000
    })

    // Parse JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Failed to extract JSON from summary response')
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      title: parsed.title || 'Consolidated Summary',
      content: parsed.content || '',
      category
    }
  } catch (error) {
    console.error('Failed to generate summary:', error)
    return null
  }
}

/**
 * Manually trigger consolidation for a specific user within a workspace
 */
export async function consolidateUserMemories(
  workspaceId: string,
  userId: string
): Promise<{ summariesCreated: number; summariesUpdated: number }> {
  const supabase = createAdminClient()

  // Get user's facts
  const { data: facts } = await supabase
    .from('agent_memory_facts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!facts || facts.length < 3) {
    return { summariesCreated: 0, summariesUpdated: 0 }
  }

  // Group by fact type
  const groups = groupFactsByCategory(facts)

  let summariesCreated = 0
  let summariesUpdated = 0

  for (const [key, groupFacts] of Object.entries(groups)) {
    if (groupFacts.length < 3) continue

    const [factType] = key.split(':')
    const category = mapFactTypeToSummaryCategory(factType)

    try {
      const summary = await generateSummary(groupFacts, category)
      if (!summary) continue

      const embedding = await generateEmbedding(summary.content)
      const factIds = groupFacts.map(f => f.id)

      const { data: existingSummary } = await supabase
        .from('agent_memory_summaries')
        .select('id, consolidation_count, source_fact_ids')
        .eq('workspace_id', workspaceId)
        .eq('scope', 'user')
        .eq('category', category)
        .eq('user_id', userId)
        .maybeSingle()

      if (existingSummary) {
        const newSourceIds = [...new Set([...existingSummary.source_fact_ids, ...factIds])]

        await supabase
          .from('agent_memory_summaries')
          .update({
            title: summary.title,
            content: summary.content,
            embedding,
            source_fact_ids: newSourceIds,
            fact_count: newSourceIds.length,
            last_consolidated_at: new Date().toISOString(),
            consolidation_count: existingSummary.consolidation_count + 1
          })
          .eq('id', existingSummary.id)

        summariesUpdated++
      } else {
        await supabase
          .from('agent_memory_summaries')
          .insert({
            workspace_id: workspaceId,
            scope: 'user',
            user_id: userId,
            agent_id: null,
            category,
            title: summary.title,
            content: summary.content,
            embedding,
            source_fact_ids: factIds,
            fact_count: factIds.length
          })

        summariesCreated++
      }
    } catch (error) {
      console.error(`Failed to consolidate user memory:`, error)
    }
  }

  return { summariesCreated, summariesUpdated }
}

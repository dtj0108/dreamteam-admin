// Memory Service - Core memory operations for agents
// Handles storing, retrieving, and managing agent memories

import { createAdminClient } from './supabase/admin'
import { generateEmbedding } from './embeddings'
import { extractFactsFromEpisode } from './memory-extraction'
import type {
  MemoryContext,
  RecallResult,
  MemorizeResult,
  MemoryFact,
  MemoryEpisode,
  FactType,
  EpisodeType,
  MemoryScope,
  RecallOptions,
  RememberOptions,
} from '@/types/memory'

/**
 * Recall relevant memories for a given query
 * Uses semantic search to find facts and summaries related to the query
 */
export async function recallMemories(
  query: string,
  context: MemoryContext,
  options: RecallOptions = {}
): Promise<RecallResult> {
  const {
    maxResults = 10,
    similarityThreshold = 0.7
  } = options

  const supabase = createAdminClient()

  try {
    // Generate embedding for the query
    const embedding = await generateEmbedding(query)

    // Call retrieval function
    const { data, error } = await supabase.rpc('recall_memories', {
      query_embedding: embedding,
      p_workspace_id: context.workspaceId,
      p_user_id: context.userId || null,
      match_count: maxResults
    })

    if (error) {
      console.error('Memory recall error:', error)
      return { facts: [], summaries: [] }
    }

    if (!data || data.length === 0) {
      return { facts: [], summaries: [] }
    }

    // Separate facts and summaries
    const factResults = data
      .filter((r: { source_type: string; similarity: number }) =>
        r.source_type === 'fact' && r.similarity >= similarityThreshold
      )
    const summaryResults = data
      .filter((r: { source_type: string }) => r.source_type === 'summary')

    // Fetch full fact details
    const facts: Array<MemoryFact & { similarity: number }> = []
    if (factResults.length > 0) {
      const factIds = factResults.map((f: { id: string }) => f.id)

      const { data: fullFacts } = await supabase
        .from('agent_memory_facts')
        .select('*')
        .in('id', factIds)

      if (fullFacts) {
        facts.push(...fullFacts.map((f: MemoryFact) => ({
          ...f,
          similarity: factResults.find((fr: { id: string }) => fr.id === f.id)?.similarity || 0
        })))
      }

      // Update access timestamps for retrieved facts (async, don't block)
      Promise.resolve(supabase.rpc('update_fact_access', { fact_ids: factIds })).catch(console.error)
    }

    // Fetch full summary details
    const summaries = []
    if (summaryResults.length > 0) {
      const summaryIds = summaryResults.map((s: { id: string }) => s.id)

      const { data: fullSummaries } = await supabase
        .from('agent_memory_summaries')
        .select('*')
        .in('id', summaryIds)

      if (fullSummaries) {
        summaries.push(...fullSummaries.map((s) => ({
          ...s,
          similarity: summaryResults.find((sr: { id: string }) => sr.id === s.id)?.similarity || 0
        })))
      }
    }

    return { facts, summaries }
  } catch (error) {
    console.error('Memory recall error:', error)
    return { facts: [], summaries: [] }
  }
}

/**
 * Store a new memory episode and optionally extract facts
 * Episodes are raw interaction logs that can be processed for fact extraction
 */
export async function memorize(
  episodeType: EpisodeType,
  content: Record<string, unknown>,
  context: MemoryContext,
  options: { extractFacts?: boolean } = {}
): Promise<MemorizeResult> {
  const { extractFacts = true } = options
  const supabase = createAdminClient()

  // Store the episode
  const { data: episode, error: episodeError } = await supabase
    .from('agent_memory_episodes')
    .insert({
      workspace_id: context.workspaceId,
      user_id: context.userId || null,
      agent_id: context.agentId || null,
      episode_type: episodeType,
      content,
      started_at: new Date().toISOString()
    })
    .select()
    .single()

  if (episodeError) {
    throw new Error(`Failed to store episode: ${episodeError.message}`)
  }

  // Extract facts asynchronously (don't block)
  if (extractFacts) {
    extractFactsFromEpisode(episode.id).catch(console.error)
  }

  return {
    episodeId: episode.id,
    extractedFacts: [] // Facts extracted async
  }
}

/**
 * Explicitly remember a fact (agent-initiated or manual)
 * Performs deduplication check before storing
 */
export async function rememberFact(
  content: string,
  factType: FactType,
  context: MemoryContext,
  options: RememberOptions = {}
): Promise<MemoryFact> {
  const {
    scope = 'user',
    importance = 0.7,
    sourceEpisodeId,
    confidence = 1.0
  } = options

  const supabase = createAdminClient()

  // Generate embedding
  const embedding = await generateEmbedding(content)

  // Check for similar existing facts (deduplication)
  const { data: similar } = await supabase.rpc('match_memory_facts', {
    query_embedding: embedding,
    p_workspace_id: context.workspaceId,
    p_user_id: context.userId || null,
    p_scope: scope,
    match_count: 1,
    similarity_threshold: 0.95 // High threshold for deduplication
  })

  if (similar && similar.length > 0) {
    // Update existing fact instead of creating duplicate
    const { data: updated, error } = await supabase
      .from('agent_memory_facts')
      .update({
        content,
        importance: Math.max(similar[0].importance, importance),
        confidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', similar[0].id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update existing fact: ${error.message}`)
    }

    return updated
  }

  // Create new fact
  const { data: fact, error } = await supabase
    .from('agent_memory_facts')
    .insert({
      workspace_id: context.workspaceId,
      user_id: scope === 'user' ? context.userId : null,
      agent_id: scope === 'agent' ? context.agentId : null,
      scope,
      fact_type: factType,
      content,
      embedding,
      importance,
      confidence,
      source_episode_id: sourceEpisodeId || null
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to store fact: ${error.message}`)
  }

  return fact
}

/**
 * Forget a specific fact (soft delete by marking inactive)
 */
export async function forgetFact(factId: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('agent_memory_facts')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', factId)

  if (error) {
    throw new Error(`Failed to forget fact: ${error.message}`)
  }
}

/**
 * Hard delete a fact (permanent removal)
 */
export async function deleteFact(factId: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('agent_memory_facts')
    .delete()
    .eq('id', factId)

  if (error) {
    throw new Error(`Failed to delete fact: ${error.message}`)
  }
}

/**
 * Get a specific fact by ID
 */
export async function getFact(factId: string): Promise<MemoryFact | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('agent_memory_facts')
    .select('*')
    .eq('id', factId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Update a fact's content or metadata
 */
export async function updateFact(
  factId: string,
  updates: Partial<Pick<MemoryFact, 'content' | 'fact_type' | 'importance' | 'scope' | 'is_active'>>
): Promise<MemoryFact> {
  const supabase = createAdminClient()

  // If content is being updated, regenerate embedding
  let embedding: number[] | undefined
  if (updates.content) {
    embedding = await generateEmbedding(updates.content)
  }

  const { data, error } = await supabase
    .from('agent_memory_facts')
    .update({
      ...updates,
      ...(embedding ? { embedding } : {}),
      updated_at: new Date().toISOString()
    })
    .eq('id', factId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update fact: ${error.message}`)
  }

  return data
}

/**
 * List facts with filtering options
 */
export async function listFacts(
  workspaceId: string,
  options: {
    scope?: MemoryScope
    factType?: FactType
    userId?: string
    agentId?: string
    isActive?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ facts: MemoryFact[]; total: number }> {
  const {
    scope,
    factType,
    userId,
    agentId,
    isActive = true,
    limit = 50,
    offset = 0
  } = options

  const supabase = createAdminClient()

  let query = supabase
    .from('agent_memory_facts')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (scope) query = query.eq('scope', scope)
  if (factType) query = query.eq('fact_type', factType)
  if (userId) query = query.eq('user_id', userId)
  if (agentId) query = query.eq('agent_id', agentId)
  if (isActive !== undefined) query = query.eq('is_active', isActive)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to list facts: ${error.message}`)
  }

  return { facts: data || [], total: count || 0 }
}

/**
 * List episodes with filtering options
 */
export async function listEpisodes(
  workspaceId: string,
  options: {
    episodeType?: EpisodeType
    userId?: string
    agentId?: string
    isProcessed?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ episodes: MemoryEpisode[]; total: number }> {
  const {
    episodeType,
    userId,
    agentId,
    isProcessed,
    limit = 50,
    offset = 0
  } = options

  const supabase = createAdminClient()

  let query = supabase
    .from('agent_memory_episodes')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (episodeType) query = query.eq('episode_type', episodeType)
  if (userId) query = query.eq('user_id', userId)
  if (agentId) query = query.eq('agent_id', agentId)
  if (isProcessed !== undefined) query = query.eq('is_processed', isProcessed)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to list episodes: ${error.message}`)
  }

  return { episodes: data || [], total: count || 0 }
}

/**
 * Get memory statistics for a workspace
 */
export async function getMemoryStats(workspaceId: string) {
  const supabase = createAdminClient()

  // Get episode counts
  const { count: totalEpisodes } = await supabase
    .from('agent_memory_episodes')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  const { count: processedEpisodes } = await supabase
    .from('agent_memory_episodes')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_processed', true)

  // Get fact counts
  const { count: totalFacts } = await supabase
    .from('agent_memory_facts')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  const { count: activeFacts } = await supabase
    .from('agent_memory_facts')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  // Get summary count
  const { count: totalSummaries } = await supabase
    .from('agent_memory_summaries')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  // Get facts by type
  const { data: factsByTypeData } = await supabase
    .from('agent_memory_facts')
    .select('fact_type')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  const factsByType: Record<string, number> = {
    preference: 0,
    context: 0,
    knowledge: 0,
    relationship: 0
  }
  factsByTypeData?.forEach(f => {
    factsByType[f.fact_type] = (factsByType[f.fact_type] || 0) + 1
  })

  // Get facts by scope
  const { data: factsByScopeData } = await supabase
    .from('agent_memory_facts')
    .select('scope')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  const factsByScope: Record<string, number> = {
    user: 0,
    workspace: 0,
    agent: 0
  }
  factsByScopeData?.forEach(f => {
    factsByScope[f.scope] = (factsByScope[f.scope] || 0) + 1
  })

  return {
    totalEpisodes: totalEpisodes || 0,
    processedEpisodes: processedEpisodes || 0,
    unprocessedEpisodes: (totalEpisodes || 0) - (processedEpisodes || 0),
    totalFacts: totalFacts || 0,
    activeFacts: activeFacts || 0,
    totalSummaries: totalSummaries || 0,
    factsByType,
    factsByScope
  }
}

// Memory Extraction Service - Extract facts from episodes using LLM
// Runs as a background job to process raw interaction logs

import { createAdminClient } from './supabase/admin'
import { generateText } from 'ai'
import { anthropic } from './ai-sdk-provider'
import { generateEmbedding } from './embeddings'
import type { ExtractedFact, MemoryEpisode } from '@/types/memory'

const EXTRACTION_PROMPT = `Analyze this interaction and extract key facts worth remembering for future conversations.

For each fact, classify it as:
- preference: User likes/dislikes, communication style preferences, timezone, priorities
- context: Project-specific information, deadlines, status, blockers, current work
- knowledge: Domain facts, how things work in this workspace, technical details
- relationship: Connections between people, projects, teams, responsibilities

Output JSON array of facts:
[
  {
    "content": "The extracted fact as a clear, standalone statement",
    "type": "preference|context|knowledge|relationship",
    "scope": "user|workspace",
    "importance": 0.1-1.0
  }
]

Guidelines:
- Only extract facts that would be useful in future interactions
- Facts should be clear and standalone (understandable without context)
- Do not extract trivial or obvious information
- Do not extract temporary states that will quickly become outdated
- User-specific facts should use scope "user", general workspace facts use "workspace"
- Rate importance based on how likely the fact is to be relevant in future conversations

If there are no meaningful facts to extract, return an empty array: []
`

/**
 * Extract facts from a memory episode using LLM analysis
 * Called asynchronously after an episode is stored
 */
export async function extractFactsFromEpisode(episodeId: string): Promise<void> {
  const supabase = createAdminClient()

  // Get the episode
  const { data: episode, error: fetchError } = await supabase
    .from('agent_memory_episodes')
    .select('*')
    .eq('id', episodeId)
    .single()

  if (fetchError || !episode) {
    console.error('Failed to fetch episode for extraction:', fetchError)
    return
  }

  // Skip if already processed
  if (episode.is_processed) {
    return
  }

  try {
    // Prepare episode content for analysis
    const contentStr = formatEpisodeContent(episode)

    // Use LLM to extract facts (use cheap model for extraction)
    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: EXTRACTION_PROMPT,
      prompt: contentStr,
      maxTokens: 2000
    })

    // Parse extracted facts
    let facts: ExtractedFact[] = []
    try {
      // Try to extract JSON from the response
      const jsonMatch = result.text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        facts = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error('Failed to parse extraction result:', parseError)
      // Continue without facts if parsing fails
    }

    // Validate and filter facts
    facts = facts.filter(isValidFact)

    // Store each extracted fact
    for (const fact of facts) {
      try {
        const embedding = await generateEmbedding(fact.content)

        // Check for similar existing facts to avoid duplicates
        const { data: similar } = await supabase.rpc('match_memory_facts', {
          query_embedding: embedding,
          p_workspace_id: episode.workspace_id,
          p_user_id: episode.user_id,
          p_scope: fact.scope,
          match_count: 1,
          similarity_threshold: 0.9
        })

        if (similar && similar.length > 0) {
          // Update existing fact if new one has higher importance
          if (fact.importance > similar[0].importance) {
            await supabase
              .from('agent_memory_facts')
              .update({
                content: fact.content,
                importance: fact.importance,
                updated_at: new Date().toISOString()
              })
              .eq('id', similar[0].id)
          }
          continue
        }

        // Insert new fact
        await supabase
          .from('agent_memory_facts')
          .insert({
            workspace_id: episode.workspace_id,
            user_id: fact.scope === 'user' ? episode.user_id : null,
            agent_id: episode.agent_id,
            scope: fact.scope,
            fact_type: fact.type,
            content: fact.content,
            embedding,
            importance: fact.importance,
            confidence: 0.8, // Auto-extracted facts have lower confidence
            source_episode_id: episodeId
          })
      } catch (factError) {
        console.error('Failed to store extracted fact:', factError)
        // Continue with other facts
      }
    }

    // Mark episode as processed
    await supabase
      .from('agent_memory_episodes')
      .update({
        is_processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('id', episodeId)

  } catch (error) {
    console.error('Fact extraction failed:', error)
    // Don't mark as processed so it can be retried
  }
}

/**
 * Process all unprocessed episodes for a workspace
 * Can be run as a scheduled job
 */
export async function processUnprocessedEpisodes(
  workspaceId: string,
  limit: number = 10
): Promise<{ processed: number; failed: number }> {
  const supabase = createAdminClient()

  const { data: episodes } = await supabase
    .from('agent_memory_episodes')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_processed', false)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (!episodes || episodes.length === 0) {
    return { processed: 0, failed: 0 }
  }

  let processed = 0
  let failed = 0

  for (const episode of episodes) {
    try {
      await extractFactsFromEpisode(episode.id)
      processed++
    } catch {
      failed++
    }
  }

  return { processed, failed }
}

/**
 * Format episode content for LLM analysis
 */
function formatEpisodeContent(episode: MemoryEpisode): string {
  const content = episode.content

  // Format based on episode type
  switch (episode.episode_type) {
    case 'conversation':
      return formatConversationContent(content)
    case 'scheduled_task':
      return formatScheduledTaskContent(content)
    case 'tool_execution':
      return formatToolExecutionContent(content)
    default:
      return JSON.stringify(content, null, 2)
  }
}

function formatConversationContent(content: Record<string, unknown>): string {
  const parts: string[] = []

  if (content.taskPrompt) {
    parts.push(`User Request: ${content.taskPrompt}`)
  }

  if (content.messages && Array.isArray(content.messages)) {
    parts.push('Conversation:')
    for (const msg of content.messages) {
      if (typeof msg === 'object' && msg !== null) {
        const role = (msg as { role?: string }).role || 'unknown'
        const msgContent = (msg as { content?: string }).content || ''
        parts.push(`${role}: ${msgContent}`)
      }
    }
  }

  if (content.result) {
    parts.push(`Agent Response: ${content.result}`)
  }

  if (content.toolCalls && Array.isArray(content.toolCalls)) {
    parts.push('Tools Used:')
    for (const tc of content.toolCalls) {
      if (typeof tc === 'object' && tc !== null) {
        const name = (tc as { name?: string }).name || 'unknown'
        parts.push(`- ${name}`)
      }
    }
  }

  return parts.join('\n\n')
}

function formatScheduledTaskContent(content: Record<string, unknown>): string {
  const parts: string[] = []

  if (content.taskName) {
    parts.push(`Scheduled Task: ${content.taskName}`)
  }

  if (content.description) {
    parts.push(`Description: ${content.description}`)
  }

  if (content.result) {
    parts.push(`Result: ${content.result}`)
  }

  return parts.join('\n\n')
}

function formatToolExecutionContent(content: Record<string, unknown>): string {
  const parts: string[] = []

  if (content.toolName) {
    parts.push(`Tool: ${content.toolName}`)
  }

  if (content.input) {
    parts.push(`Input: ${JSON.stringify(content.input)}`)
  }

  if (content.output) {
    parts.push(`Output: ${JSON.stringify(content.output)}`)
  }

  return parts.join('\n\n')
}

/**
 * Validate extracted fact structure
 */
function isValidFact(fact: unknown): fact is ExtractedFact {
  if (!fact || typeof fact !== 'object') return false

  const f = fact as Record<string, unknown>

  if (typeof f.content !== 'string' || f.content.length < 10) return false
  if (!['preference', 'context', 'knowledge', 'relationship'].includes(f.type as string)) return false
  if (!['user', 'workspace'].includes(f.scope as string)) return false
  if (typeof f.importance !== 'number' || f.importance < 0 || f.importance > 1) return false

  return true
}

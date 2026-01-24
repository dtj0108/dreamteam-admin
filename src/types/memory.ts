// Agent Memory System Types

export type MemoryScope = 'user' | 'workspace' | 'agent'
export type FactType = 'preference' | 'context' | 'knowledge' | 'relationship'
export type EpisodeType = 'conversation' | 'scheduled_task' | 'tool_execution'
export type SummaryCategory = 'user_profile' | 'project_context' | 'domain_knowledge' | 'communication_style' | 'workflow'

// Database row types
export interface MemoryEpisode {
  id: string
  workspace_id: string
  user_id: string | null
  agent_id: string | null
  episode_type: EpisodeType
  content: Record<string, unknown>
  started_at: string
  ended_at: string | null
  token_count: number | null
  is_processed: boolean
  processed_at: string | null
  created_at: string
}

export interface MemoryFact {
  id: string
  workspace_id: string
  scope: MemoryScope
  user_id: string | null
  agent_id: string | null
  fact_type: FactType
  content: string
  embedding?: number[] | null
  source_episode_id: string | null
  confidence: number
  importance: number
  access_count: number
  last_accessed_at: string | null
  decay_factor: number
  is_active: boolean
  superseded_by: string | null
  created_at: string
  updated_at: string
}

export interface MemorySummary {
  id: string
  workspace_id: string
  scope: MemoryScope
  user_id: string | null
  agent_id: string | null
  category: SummaryCategory
  title: string
  content: string
  embedding?: number[] | null
  source_fact_ids: string[]
  fact_count: number
  last_consolidated_at: string
  consolidation_count: number
  created_at: string
  updated_at: string
}

// Context for memory operations
export interface MemoryContext {
  workspaceId: string
  userId?: string
  agentId?: string
}

// Results from recall operations
export interface RecallResult {
  facts: Array<MemoryFact & { similarity: number }>
  summaries: Array<MemorySummary & { similarity: number }>
}

// Result from memorize operation
export interface MemorizeResult {
  episodeId: string
  extractedFacts: MemoryFact[]
}

// Options for recall operations
export interface RecallOptions {
  maxResults?: number
  includeWorkspace?: boolean
  factTypes?: FactType[]
  similarityThreshold?: number
}

// Options for remember operations
export interface RememberOptions {
  scope?: MemoryScope
  importance?: number
  sourceEpisodeId?: string
  confidence?: number
}

// LLM extraction result types
export interface ExtractedFact {
  content: string
  type: FactType
  scope: MemoryScope
  importance: number
}

export interface ExtractionResult {
  facts: ExtractedFact[]
  reasoning?: string
}

// Summary generation types
export interface GeneratedSummary {
  title: string
  content: string
  category: SummaryCategory
}

// Admin API response types
export interface MemoryStatsResponse {
  totalEpisodes: number
  processedEpisodes: number
  unprocessedEpisodes: number
  totalFacts: number
  activeFacts: number
  totalSummaries: number
  factsByType: Record<FactType, number>
  factsByScope: Record<MemoryScope, number>
}

export interface MemoryListResponse {
  facts: MemoryFact[]
  summaries: MemorySummary[]
  total: number
}

export interface EpisodeListResponse {
  episodes: MemoryEpisode[]
  total: number
}

// Fact with enriched data for admin UI
export interface MemoryFactWithMeta extends MemoryFact {
  workspace?: { id: string; name: string }
  user?: { id: string; email: string; full_name: string | null }
  agent?: { id: string; name: string }
  source_episode?: MemoryEpisode
}

// Summary with enriched data for admin UI
export interface MemorySummaryWithMeta extends MemorySummary {
  workspace?: { id: string; name: string }
  user?: { id: string; email: string; full_name: string | null }
  agent?: { id: string; name: string }
}

// Memory Tools for Agents - AI SDK compatible tools for memory operations
// These tools allow agents to remember, recall, and forget information

import { z } from 'zod'
import { tool } from 'ai'
import { recallMemories, rememberFact, forgetFact, getFact } from './memory-service'
import type { MemoryContext, FactType, MemoryScope } from '@/types/memory'

/**
 * Build memory tools for an agent with the given context
 * Returns tools that can be passed to the AI SDK's generateText/streamText
 */
export function buildMemoryTools(context: MemoryContext) {
  return {
    Remember: tool({
      description: `Store important information for future reference. Use this to remember:
- User preferences (communication style, timezone, priorities, likes/dislikes)
- Project context (deadlines, status, blockers, current focus)
- Key facts that would be useful in future conversations
- Relationships and connections between people, projects, or concepts

Guidelines:
- Only remember genuinely useful information
- Do NOT remember trivial details or things already in the system
- Write facts as clear, standalone statements
- Use 'high' importance for critical preferences or constraints
- Use 'medium' for useful context that may come up again
- Use 'low' for nice-to-know information`,
      parameters: z.object({
        fact: z.string().describe('The information to remember as a clear, standalone statement'),
        type: z.enum(['preference', 'context', 'knowledge', 'relationship']).describe(
          'Category: preference (user likes/dislikes), context (project info), knowledge (domain facts), relationship (connections)'
        ),
        importance: z.enum(['low', 'medium', 'high']).describe('How important is this to remember for future conversations')
      }),
      execute: async ({ fact, type, importance }) => {
        const importanceMap: Record<string, number> = {
          low: 0.3,
          medium: 0.6,
          high: 0.9
        }

        try {
          const result = await rememberFact(fact, type as FactType, context, {
            importance: importanceMap[importance]
          })

          return {
            success: true,
            message: `Remembered: "${fact.substring(0, 50)}${fact.length > 50 ? '...' : ''}"`,
            factId: result.id
          }
        } catch (error) {
          console.error('Remember tool error:', error)
          return {
            success: false,
            message: 'Failed to store memory'
          }
        }
      }
    }),

    Recall: tool({
      description: `Search your memory for relevant information. Use this when:
- You need context about a user or project before responding
- Looking for past decisions, preferences, or discussions
- Checking if you already know something relevant to the current task
- Personalizing your response based on what you know

The search uses semantic similarity, so describe what you're looking for naturally.`,
      parameters: z.object({
        query: z.string().describe('What to search for in memory - describe naturally what information you need'),
        limit: z.number().optional().describe('Maximum number of results to return (default: 5, max: 20)')
      }),
      execute: async ({ query, limit = 5 }) => {
        try {
          const memories = await recallMemories(query, context, {
            maxResults: Math.min(limit, 20)
          })

          if (memories.facts.length === 0 && memories.summaries.length === 0) {
            return {
              success: true,
              found: false,
              message: 'No relevant memories found',
              facts: [],
              summaries: []
            }
          }

          return {
            success: true,
            found: true,
            facts: memories.facts.map(f => ({
              id: f.id,
              content: f.content,
              type: f.fact_type,
              relevance: Math.round(f.similarity * 100) / 100
            })),
            summaries: memories.summaries.map(s => ({
              id: s.id,
              title: s.title,
              content: s.content,
              category: s.category
            }))
          }
        } catch (error) {
          console.error('Recall tool error:', error)
          return {
            success: false,
            message: 'Failed to recall memories'
          }
        }
      }
    }),

    Forget: tool({
      description: `Remove incorrect or outdated information from memory. Only use when:
- The user explicitly asks to forget something
- Information is clearly wrong or outdated
- You discover a fact contradicts newer information

Do NOT use this to clean up memories proactively - the system handles decay automatically.`,
      parameters: z.object({
        factId: z.string().describe('The ID of the fact to forget (from a previous Recall result)'),
        reason: z.string().describe('Why this information should be forgotten')
      }),
      execute: async ({ factId, reason }) => {
        try {
          // Verify the fact exists
          const fact = await getFact(factId)
          if (!fact) {
            return {
              success: false,
              message: 'Fact not found'
            }
          }

          await forgetFact(factId)

          return {
            success: true,
            message: `Forgot: "${fact.content.substring(0, 50)}${fact.content.length > 50 ? '...' : ''}"`,
            reason
          }
        } catch (error) {
          console.error('Forget tool error:', error)
          return {
            success: false,
            message: 'Failed to forget memory'
          }
        }
      }
    })
  }
}

/**
 * Get all memory tool definitions without context binding
 * Useful for displaying available tools in admin UI
 */
export function getMemoryToolDefinitions() {
  return [
    {
      name: 'Remember',
      description: 'Store important information for future reference',
      parameters: {
        fact: 'The information to remember',
        type: 'Category: preference, context, knowledge, or relationship',
        importance: 'How important: low, medium, or high'
      }
    },
    {
      name: 'Recall',
      description: 'Search memory for relevant information',
      parameters: {
        query: 'What to search for',
        limit: 'Maximum number of results (optional)'
      }
    },
    {
      name: 'Forget',
      description: 'Remove incorrect or outdated information',
      parameters: {
        factId: 'ID of the fact to forget',
        reason: 'Why this should be forgotten'
      }
    }
  ]
}

/**
 * Inject relevant memory context into a system prompt
 * Call this before running an agent to add personalized context
 */
export async function injectMemoryContext(
  systemPrompt: string,
  taskPrompt: string,
  context: MemoryContext
): Promise<string> {
  // Recall relevant memories based on the task
  const memories = await recallMemories(taskPrompt, context, { maxResults: 8 })

  if (memories.facts.length === 0 && memories.summaries.length === 0) {
    return systemPrompt
  }

  // Build memory section
  const memorySections: string[] = ['## Relevant Context from Memory\n']

  // Add summaries first (higher level context)
  if (memories.summaries.length > 0) {
    for (const summary of memories.summaries) {
      memorySections.push(`### ${summary.title}`)
      memorySections.push(summary.content)
      memorySections.push('')
    }
  }

  // Add individual facts
  if (memories.facts.length > 0) {
    memorySections.push('### Known Facts')
    for (const fact of memories.facts) {
      memorySections.push(`- ${fact.content}`)
    }
    memorySections.push('')
  }

  memorySections.push('Use this context to personalize your response. Do not explicitly mention that you "remember" things unless it\'s relevant to do so.\n')

  return memorySections.join('\n') + '\n' + systemPrompt
}

/**
 * Create a memory context from common parameters
 * Helper function for API routes
 */
export function createMemoryContext(
  workspaceId: string,
  userId?: string,
  agentId?: string
): MemoryContext {
  return {
    workspaceId,
    userId,
    agentId
  }
}

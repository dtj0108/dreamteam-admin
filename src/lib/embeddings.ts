// Embeddings Service - OpenAI text-embedding-3-small
// Generates vector embeddings for semantic search in the memory system

import OpenAI from 'openai'

// Lazy-initialized OpenAI client
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for embeddings')
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

// Model constants
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSION = 1536
const MAX_INPUT_LENGTH = 8191 // text-embedding-3-small supports 8191 tokens

/**
 * Generate an embedding vector for a single text input
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient()

  // Truncate to model limit
  const truncatedText = text.slice(0, MAX_INPUT_LENGTH)

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedText,
  })

  return response.data[0].embedding
}

/**
 * Generate embedding vectors for multiple text inputs (batch)
 * More efficient than calling generateEmbedding multiple times
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return []
  }

  const openai = getOpenAIClient()

  // Truncate each text to model limit
  const truncatedTexts = texts.map(t => t.slice(0, MAX_INPUT_LENGTH))

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedTexts,
  })

  // Return embeddings in the same order as input
  return response.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((d: { embedding: number[] }) => d.embedding)
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns a value between -1 and 1, where 1 is most similar
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding vectors must have the same dimension')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  if (magnitude === 0) return 0

  return dotProduct / magnitude
}

/**
 * Format embedding vector for Supabase pgvector storage
 * Converts number array to the string format expected by pgvector
 */
export function formatEmbeddingForStorage(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

/**
 * Get the expected embedding dimension
 */
export function getEmbeddingDimension(): number {
  return EMBEDDING_DIMENSION
}

/**
 * Get the model name being used for embeddings
 */
export function getEmbeddingModel(): string {
  return EMBEDDING_MODEL
}

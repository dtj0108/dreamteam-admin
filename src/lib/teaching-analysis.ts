import { generateText } from 'ai'
import { anthropic } from './ai-sdk-provider'
import type { AnalysisResult, LearnedRuleType } from '@/types/skills'

interface AnalysisRequest {
  skillName: string
  skillContent: string
  originalOutput: string
  correctedOutput: string
  userInstruction?: string | null
}

const ANALYSIS_PROMPT = `You are analyzing a user correction to an AI agent's output. Your job is to identify what the user changed and why, then extract a learnable rule that can improve future responses.

## Skill Being Used
Name: {{skillName}}
Content:
{{skillContent}}

## Original Agent Output
{{originalOutput}}

## User's Corrected Output
{{correctedOutput}}

{{userInstructionSection}}

## Your Task
1. Identify all changes between original and corrected output
2. Categorize each change (addition, removal, modification)
3. Determine the MOST SIGNIFICANT pattern that should be learned
4. Suggest a rule type:
   - instruction: A new step or guideline to follow
   - template: A reusable text pattern
   - edge_case: A conditional rule for specific situations
   - trigger: A new phrase that should activate this skill
   - tone: Adjustment to voice, formality, or style
   - format: Change to structure, length, or layout

5. Write the rule content that captures this learning
6. Provide your confidence (0-1) and reasoning

Respond in JSON format only, with this structure:
{
  "changes": [
    {
      "type": "addition" | "removal" | "modification",
      "description": "Brief description of the change",
      "originalText": "Original text if applicable",
      "correctedText": "Corrected text if applicable"
    }
  ],
  "suggestedRuleType": "instruction" | "template" | "edge_case" | "trigger" | "tone" | "format",
  "suggestedRuleContent": "The specific rule to learn from this correction",
  "suggestedConditions": {},
  "confidence": 0.85,
  "reasoning": "Why this rule was extracted and how confident you are"
}`

export async function analyzeTeaching(request: AnalysisRequest): Promise<AnalysisResult> {
  const userInstructionSection = request.userInstruction
    ? `## User's Instruction (if provided)\n${request.userInstruction}`
    : ''

  const prompt = ANALYSIS_PROMPT
    .replace('{{skillName}}', request.skillName)
    .replace('{{skillContent}}', request.skillContent || 'No skill content provided')
    .replace('{{originalOutput}}', request.originalOutput)
    .replace('{{correctedOutput}}', request.correctedOutput)
    .replace('{{userInstructionSection}}', userInstructionSection)

  try {
    const response = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt,
    })

    // Extract text content from response
    const textContent = response.text
    if (!textContent) {
      throw new Error('No text response from Claude')
    }

    // Parse JSON response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response')
    }

    const result = JSON.parse(jsonMatch[0])

    // Validate and normalize the result
    const validRuleTypes: LearnedRuleType[] = ['instruction', 'template', 'edge_case', 'trigger', 'tone', 'format']

    const analysisResult: AnalysisResult = {
      changes: Array.isArray(result.changes) ? result.changes : [],
      suggestedRuleType: validRuleTypes.includes(result.suggestedRuleType)
        ? result.suggestedRuleType
        : 'instruction',
      suggestedRuleContent: result.suggestedRuleContent || '',
      suggestedConditions: result.suggestedConditions || {},
      confidence: typeof result.confidence === 'number'
        ? Math.min(1, Math.max(0, result.confidence))
        : 0.5,
      reasoning: result.reasoning || ''
    }

    return analysisResult
  } catch (err) {
    console.error('Teaching analysis error:', err)
    throw new Error(
      err instanceof Error
        ? `Analysis failed: ${err.message}`
        : 'Analysis failed: Unknown error'
    )
  }
}

// Helper to compute simple diff for display
export function computeSimpleDiff(original: string, corrected: string): {
  additions: string[]
  removals: string[]
  common: string[]
} {
  const originalLines = original.split('\n')
  const correctedLines = corrected.split('\n')

  const additions: string[] = []
  const removals: string[] = []
  const common: string[] = []

  // Simple line-by-line comparison
  const originalSet = new Set(originalLines)
  const correctedSet = new Set(correctedLines)

  for (const line of originalLines) {
    if (!correctedSet.has(line)) {
      removals.push(line)
    } else {
      common.push(line)
    }
  }

  for (const line of correctedLines) {
    if (!originalSet.has(line)) {
      additions.push(line)
    }
  }

  return { additions, removals, common }
}

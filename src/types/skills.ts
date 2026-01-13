// Skills Library + Teaching System Types

export interface AgentSkill {
  id: string
  name: string
  description: string | null
  department_id: string | null
  skill_content: string
  category: string
  version: number
  triggers: SkillTrigger[]
  templates: SkillTemplate[]
  edge_cases: SkillEdgeCase[]
  learned_rules_count: number
  is_system: boolean
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface SkillTrigger {
  phrase: string
  matchType: 'exact' | 'contains' | 'regex'
  priority: number
}

export interface SkillTemplate {
  id: string
  name: string
  description: string
  content: string
  variables: TemplateVariable[]
  tags: string[]
}

export interface TemplateVariable {
  name: string
  description: string
  required: boolean
  default?: string
}

export interface SkillEdgeCase {
  id: string
  condition: string
  conditionLogic?: EdgeCaseConditionLogic
  instructions: string[]
  priority: number
}

export interface EdgeCaseConditionLogic {
  field: string
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than'
  value: string
}

export type TeachingStatus = 'pending' | 'analyzing' | 'completed' | 'failed'

export interface SkillTeaching {
  id: string
  skill_id: string
  agent_id: string | null
  workspace_id: string
  user_id: string
  original_output: string
  corrected_output: string
  conversation_id: string | null
  message_context: Record<string, unknown>
  user_instruction: string | null
  analysis_status: TeachingStatus
  analysis_result: AnalysisResult | null
  created_at: string
  analyzed_at: string | null
  // Joined fields
  skill?: AgentSkill
}

export interface AnalysisResult {
  changes: AnalysisChange[]
  suggestedRuleType: LearnedRuleType
  suggestedRuleContent: string
  suggestedConditions?: Record<string, unknown>
  confidence: number
  reasoning: string
}

export interface AnalysisChange {
  type: 'addition' | 'removal' | 'modification'
  description: string
  originalText?: string
  correctedText?: string
}

export type LearnedRuleType = 'instruction' | 'template' | 'edge_case' | 'trigger' | 'tone' | 'format'

export type RuleScope = 'workspace' | 'global'

export interface SkillLearnedRule {
  id: string
  skill_id: string
  teaching_id: string | null
  rule_type: LearnedRuleType
  rule_content: string
  rule_description: string | null
  conditions: Record<string, unknown>
  scope: RuleScope
  workspace_id: string | null
  confidence_score: number
  times_applied: number
  times_successful: number
  is_reviewed: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SkillChangeType = 'created' | 'manual_edit' | 'learned_rule_added' | 'rule_promoted' | 'rollback'

export interface SkillVersion {
  id: string
  skill_id: string
  version: number
  skill_content: string
  triggers: SkillTrigger[]
  templates: SkillTemplate[]
  edge_cases: SkillEdgeCase[]
  change_type: SkillChangeType
  change_description: string | null
  change_details: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export interface TeachingPattern {
  id: string
  skill_id: string
  pattern_type: string
  pattern_signature: string
  pattern_description: string | null
  occurrence_count: number
  workspace_ids: string[]
  first_seen_at: string
  last_seen_at: string
  sample_teaching_ids: string[]
  is_promoted: boolean
  promoted_to_rule_id: string | null
}

// API Request/Response Types

export interface CreateSkillRequest {
  name: string
  description?: string
  department_id?: string
  skill_content: string
  category?: string
  triggers?: SkillTrigger[]
  templates?: SkillTemplate[]
  edge_cases?: SkillEdgeCase[]
  is_enabled?: boolean
}

export interface UpdateSkillRequest {
  name?: string
  description?: string
  department_id?: string
  skill_content?: string
  category?: string
  triggers?: SkillTrigger[]
  templates?: SkillTemplate[]
  edge_cases?: SkillEdgeCase[]
  is_enabled?: boolean
}

export interface CreateTeachingRequest {
  skill_id: string
  agent_id?: string
  workspace_id: string
  user_id: string
  original_output: string
  corrected_output: string
  conversation_id?: string
  message_context?: Record<string, unknown>
  user_instruction?: string
}

export interface CreateLearnedRuleRequest {
  rule_type: LearnedRuleType
  rule_content: string
  rule_description?: string
  conditions?: Record<string, unknown>
  scope?: RuleScope
  workspace_id?: string
}

export interface ApplyTeachingRequest {
  rule_type: LearnedRuleType
  rule_content: string
  rule_description?: string
  conditions?: Record<string, unknown>
  scope?: RuleScope
}

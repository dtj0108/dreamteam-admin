'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Save,
  User,
  Wrench,
  BookOpen,
  FileText,
  Users,
  Shield,
  Play,
  Plus,
  Trash2,
  GripVertical,
  History,
  Upload,
  Download,
  Check,
  Copy,
  Loader2,
  ChevronRight,
  ChevronDown,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Brain,
  Building2,
  Building,
  Sparkles,
  Lock,
  FileCheck
} from 'lucide-react'
import type {
  AgentWithRelations,
  AgentVersion,
  AgentSDKConfig,
  AgentTool,
  AgentRule,
  AgentPromptSection,
  RuleType,
  PromptSectionType,
  AgentModel,
  AIProvider,
  PermissionMode,
  AgentSchedule,
  AgentScheduleExecution,
  ToolValidationResult,
  ProductionTestResult,
  MCPTestResult
} from '@/types/agents'
import { validateToolSchemas, getValidationSummary, getProductionTestSummary, getMCPTestSummary } from '@/lib/tool-schema-validator'
import { SCHEDULE_PRESETS, EXECUTION_STATUS_LABELS } from '@/types/agents'
import { describeCron } from '@/lib/cron-utils'

const PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'xai', label: 'xAI (Grok)' },
]

const MODEL_OPTIONS_BY_PROVIDER: Record<AIProvider, { value: AgentModel; label: string }[]> = {
  anthropic: [
    { value: 'haiku', label: 'Claude Haiku 4.5 (Fast)' },
    { value: 'sonnet', label: 'Claude Sonnet 4.5 (Balanced)' },
    { value: 'opus', label: 'Claude Opus 4.5 (Most Capable)' },
  ],
  xai: [
    { value: 'grok-3-mini', label: 'Grok 3 Mini (Fast)' },
    { value: 'grok-4-fast', label: 'Grok 4 Fast (Balanced)' },
    { value: 'grok-2', label: 'Grok 2' },
    { value: 'grok-3', label: 'Grok 3 (Most Capable)' },
  ],
}

const DEFAULT_MODEL_BY_PROVIDER: Record<AIProvider, AgentModel> = {
  anthropic: 'sonnet',
  xai: 'grok-3',
}

const PERMISSION_MODE_OPTIONS: { value: PermissionMode; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Standard permissions with user approval' },
  { value: 'acceptEdits', label: 'Accept Edits', description: 'Auto-accept file edits' },
  { value: 'bypassPermissions', label: 'Bypass All', description: 'Full autonomous mode (use with caution)' }
]

const RULE_TYPES: { value: RuleType; label: string; description: string }[] = [
  { value: 'always', label: 'Always', description: 'Rules the agent must always follow' },
  { value: 'never', label: 'Never', description: 'Things the agent must never do' },
  { value: 'when', label: 'When', description: 'Conditional rules for specific situations' },
  { value: 'respond_with', label: 'Respond With', description: 'Predefined responses' }
]

const SECTION_TYPES: { value: PromptSectionType; label: string }[] = [
  { value: 'identity', label: 'Identity' },
  { value: 'personality', label: 'Personality' },
  { value: 'capabilities', label: 'Capabilities' },
  { value: 'constraints', label: 'Constraints' },
  { value: 'examples', label: 'Examples' },
  { value: 'custom', label: 'Custom' }
]

const TOOL_CATEGORIES = [
  'finance', 'crm', 'team', 'projects', 'knowledge', 'communications', 'goals', 'agents'
] as const

type MindScope = 'agent' | 'department' | 'company'

interface AgentMindFile {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  content: string
  content_type: string
  position: number
  is_enabled: boolean
  workspace_id: string | null
  is_system: boolean
  scope: MindScope
  department_id: string | null
}

interface AgentMindAssignment {
  mind_id: string
  position_override: number | null
  mind: AgentMindFile
}

interface AgentLearning {
  id: string
  title: string
  insight: string
  confidence_score: number
  scope: MindScope
  agent_id: string | null
  department_id: string | null
}

const MIND_CATEGORIES = [
  'finance', 'crm', 'team', 'projects', 'knowledge', 'communications', 'goals', 'shared'
] as const

const MIND_CATEGORY_LABELS: Record<string, string> = {
  finance: 'Finance',
  crm: 'CRM',
  team: 'Team',
  projects: 'Projects',
  knowledge: 'Knowledge',
  communications: 'Communications',
  goals: 'Goals',
  shared: 'Shared'
}

const MIND_CONTENT_TYPE_LABELS: Record<string, string> = {
  responsibilities: 'Responsibilities',
  workflows: 'Workflows',
  policies: 'Policies',
  metrics: 'Metrics',
  examples: 'Examples',
  general: 'General'
}

const MIND_SCOPE_LABELS: Record<MindScope, string> = {
  company: 'Company',
  department: 'Department',
  agent: 'Agent'
}

export default function AgentBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Core state
  const [agent, setAgent] = useState<AgentWithRelations | null>(null)
  const [versions, setVersions] = useState<AgentVersion[]>([])
  const [sdkConfig, setSdkConfig] = useState<AgentSDKConfig | null>(null)
  const [tokenEstimates, setTokenEstimates] = useState<{
    systemPrompt: number
    tools: number
    total: number
    toolCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('identity')

  // All tools for picker
  const [allTools, setAllTools] = useState<AgentTool[]>([])
  const [allSkills, setAllSkills] = useState<{ id: string; name: string; description: string | null; category: string }[]>([])
  const [allAgents, setAllAgents] = useState<{ id: string; name: string; avatar_url: string | null }[]>([])
  const [plans, setPlans] = useState<Array<{id: string, name: string, slug: string}>>([])


  // Identity tab state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [userDescription, setUserDescription] = useState('')
  const [provider, setProvider] = useState<AIProvider>('anthropic')
  const [model, setModel] = useState<AgentModel>('sonnet')
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('default')
  const [maxTurns, setMaxTurns] = useState(10)
  const [isHead, setIsHead] = useState(false)
  const [planId, setPlanId] = useState<string>('')

  // Tools tab state
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set())
  const [toolSearch, setToolSearch] = useState('')
  const [toolCategory, setToolCategory] = useState<string>('all')

  // Tool validation state
  const [validationResults, setValidationResults] = useState<ToolValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [showValidation, setShowValidation] = useState(false)

  // Production test state (Claude API invocation tests)
  const [productionResults, setProductionResults] = useState<ProductionTestResult[]>([])
  const [isProductionTesting, setIsProductionTesting] = useState(false)
  const [productionProgress, setProductionProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 })

  // MCP execution test state (real tool execution via MCP server)
  const [mcpTestResults, setMcpTestResults] = useState<MCPTestResult[]>([])
  const [isMcpTesting, setIsMcpTesting] = useState(false)
  const [mcpTestProgress, setMcpTestProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 })
  const [testWorkspaceId, setTestWorkspaceId] = useState<string>('')
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; slug: string }[]>([])

  // Skills tab state
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())

  // Mind tab state
  const [allMind, setAllMind] = useState<AgentMindFile[]>([])
  const [selectedMindIds, setSelectedMindIds] = useState<Set<string>>(new Set())
  const [mindCategory, setMindCategory] = useState<string>('all')

  // Hierarchical mind state
  const [companyMind, setCompanyMind] = useState<AgentMindFile[]>([])
  const [departmentMind, setDepartmentMind] = useState<AgentMindFile[]>([])
  const [agentLearnings, setAgentLearnings] = useState<AgentLearning[]>([])

  // Prompt tab state
  const [systemPrompt, setSystemPrompt] = useState('')
  const [promptSections, setPromptSections] = useState<AgentPromptSection[]>([])

  // Rules tab state
  const [rules, setRules] = useState<AgentRule[]>([])
  const [newRuleType, setNewRuleType] = useState<RuleType>('always')
  const [newRuleContent, setNewRuleContent] = useState('')
  const [newRuleCondition, setNewRuleCondition] = useState('')

  // Team tab state
  const [delegations, setDelegations] = useState<{ to_agent_id: string; condition: string; context_template: string }[]>([])

  // Schedules tab state
  const [schedules, setSchedules] = useState<AgentSchedule[]>([])
  const [scheduleExecutions, setScheduleExecutions] = useState<AgentScheduleExecution[]>([])
  const [showCreateSchedule, setShowCreateSchedule] = useState(false)
  const [newScheduleName, setNewScheduleName] = useState('')
  const [newScheduleDescription, setNewScheduleDescription] = useState('')
  const [newSchedulePreset, setNewSchedulePreset] = useState('daily')
  const [newScheduleCron, setNewScheduleCron] = useState('0 9 * * *')
  const [newSchedulePrompt, setNewSchedulePrompt] = useState('')
  const [newScheduleRequiresApproval, setNewScheduleRequiresApproval] = useState(false)
  const [creatingSchedule, setCreatingSchedule] = useState(false)

  // Version sidebar state
  const [showVersions, setShowVersions] = useState(false)

  // Fetch agent data
  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/agents/${id}`)
      if (!res.ok) throw new Error('Agent not found')

      const data = await res.json()
      setAgent(data.agent)
      setVersions(data.versions || [])
      setSdkConfig(data.sdkConfig)
      setTokenEstimates(data.tokenEstimates || null)

      // Set form values
      setName(data.agent.name)
      setSlug(data.agent.slug || '')
      setDescription(data.agent.description || '')
      setUserDescription(data.agent.user_description || '')
      setProvider(data.agent.provider || 'anthropic')
      setModel(data.agent.model)
      setPermissionMode(data.agent.permission_mode)
      setMaxTurns(data.agent.max_turns)
      setIsHead(data.agent.is_head)
      setPlanId(data.agent.plan_id || '_all')
      setSystemPrompt(data.agent.system_prompt)

      // Set tools
      const toolIds = new Set<string>((data.agent.tools || []).map((t: { tool_id: string }) => t.tool_id))
      setSelectedToolIds(toolIds)

      // Set skills
      const skillIds = new Set<string>((data.agent.skills || []).map((s: { skill_id: string }) => s.skill_id))
      setSelectedSkillIds(skillIds)

      // Set mind
      const mindIds = new Set<string>((data.agent.mind || []).map((m: { mind_id: string }) => m.mind_id))
      setSelectedMindIds(mindIds)

      // Set prompt sections
      setPromptSections(data.agent.prompt_sections || [])

      // Set rules
      setRules(data.agent.rules || [])

      // Set delegations
      setDelegations(
        (data.agent.delegations || []).map((d: { to_agent_id: string; condition: string | null; context_template: string | null }) => ({
          to_agent_id: d.to_agent_id,
          condition: d.condition || '',
          context_template: d.context_template || ''
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent')
    } finally {
      setLoading(false)
    }
  }, [id])

  // Fetch all tools
  const fetchTools = useCallback(async () => {
    const res = await fetch('/api/admin/agent-tools')
    if (res.ok) {
      const data = await res.json()
      setAllTools(data.tools || [])
    }
  }, [])

  // Fetch all skills
  const fetchSkills = useCallback(async () => {
    const res = await fetch('/api/admin/skills')
    if (res.ok) {
      const data = await res.json()
      setAllSkills(data.skills || [])
    }
  }, [])

  // Fetch all agents for delegation picker
  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/admin/agents')
    if (res.ok) {
      const data = await res.json()
      setAllAgents((data.agents || []).filter((a: { id: string }) => a.id !== id))
    }
  }, [id])

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/agents/${id}/schedules`)
      if (res.ok) {
        const data = await res.json()
        setSchedules(data.schedules || [])
      }
    } catch (err) {
      console.error('Error fetching schedules:', err)
    }
  }, [id])

  // Fetch workspaces for MCP testing
  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workspaces?limit=100')
      if (res.ok) {
        const data = await res.json()
        setWorkspaces((data.workspaces || []).map((w: { id: string; name: string; slug: string }) => ({
          id: w.id,
          name: w.name,
          slug: w.slug
        })))
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err)
    }
  }, [])

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    const res = await fetch('/api/admin/plans')
    if (res.ok) {
      const data = await res.json()
      setPlans(data.plans || [])
    }
  }, [])

  // Fetch all mind files (agent-scoped, for assignment)
  const fetchMind = useCallback(async () => {
    const res = await fetch('/api/admin/mind?scope=agent')
    if (res.ok) {
      const data = await res.json()
      setAllMind(data.mind || [])
    }
  }, [])

  // Fetch hierarchical mind (company and department scoped) for this agent
  const fetchHierarchicalMind = useCallback(async () => {
    if (!agent?.workspace_id) return

    const companyRes = await fetch(`/api/admin/mind?workspace_id=${agent.workspace_id}&scope=company`)
    if (companyRes.ok) {
      const data = await companyRes.json()
      setCompanyMind(data.mind || [])
    }

    if (agent?.department_id) {
      const deptRes = await fetch(`/api/admin/mind?workspace_id=${agent.workspace_id}&scope=department&department_id=${agent.department_id}`)
      if (deptRes.ok) {
        const data = await deptRes.json()
        setDepartmentMind(data.mind || [])
      }
    } else {
      setDepartmentMind([])
    }

    const learningsRes = await fetch(`/api/admin/learning?workspace_id=${agent.workspace_id}&is_approved=true&is_active=true`)
    if (learningsRes.ok) {
      const data = await learningsRes.json()
      const applicable = (data.learnings || []).filter((l: AgentLearning) => {
        if (l.scope === 'company') return true
        if (l.scope === 'department' && l.department_id === agent.department_id) return true
        if (l.scope === 'agent' && l.agent_id === agent.id) return true
        return false
      })
      setAgentLearnings(applicable)
    }
  }, [agent?.workspace_id, agent?.department_id, agent?.id])

  useEffect(() => {
    fetchAgent()
    fetchTools()
    fetchSkills()
    fetchAgents()
    fetchSchedules()
    fetchMind()
    fetchPlans()
    fetchWorkspaces()
  }, [fetchAgent, fetchTools, fetchSkills, fetchAgents, fetchSchedules, fetchMind, fetchPlans, fetchWorkspaces])

  useEffect(() => {
    if (agent) {
      fetchHierarchicalMind()
    }
  }, [agent, fetchHierarchicalMind])

  // Reset model to provider default when provider changes
  // This is a controlled change - we track if user explicitly changed provider
  const [providerInitialized, setProviderInitialized] = useState(false)
  useEffect(() => {
    if (providerInitialized) {
      // Provider changed by user, reset model to default for new provider
      const currentModelOptions = MODEL_OPTIONS_BY_PROVIDER[provider]
      const isCurrentModelValid = currentModelOptions.some(opt => opt.value === model)
      if (!isCurrentModelValid) {
        setModel(DEFAULT_MODEL_BY_PROVIDER[provider])
      }
    }
    setProviderInitialized(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider])

  // Save identity
  async function saveIdentity() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description: description || null,
          user_description: userDescription || null,
          provider,
          model,
          permission_mode: permissionMode,
          max_turns: maxTurns,
          is_head: isHead,
          plan_id: planId === '_all' ? null : planId,
          system_prompt: systemPrompt
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      await fetchAgent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Save tools
  async function saveTools() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/agents/${id}/tools`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_ids: Array.from(selectedToolIds) })
      })

      if (!res.ok) throw new Error('Failed to save tools')
      await fetchAgent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tools')
    } finally {
      setSaving(false)
    }
  }

  // Save skills
  async function saveSkills() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/agents/${id}/skills`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_ids: Array.from(selectedSkillIds) })
      })

      if (!res.ok) throw new Error('Failed to save skills')
      await fetchAgent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save skills')
    } finally {
      setSaving(false)
    }
  }

  // Save mind
  async function saveMind() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/agents/${id}/mind`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mind_ids: Array.from(selectedMindIds) })
      })

      if (!res.ok) throw new Error('Failed to save mind')
      await fetchAgent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mind')
    } finally {
      setSaving(false)
    }
  }

  // Save delegations
  async function saveDelegations() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/agents/${id}/team`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegations })
      })

      if (!res.ok) throw new Error('Failed to save delegations')
      await fetchAgent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save delegations')
    } finally {
      setSaving(false)
    }
  }

  // Add rule
  async function addRule() {
    if (!newRuleContent.trim()) return
    if (newRuleType === 'when' && !newRuleCondition.trim()) return

    try {
      const res = await fetch(`/api/admin/agents/${id}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_type: newRuleType,
          rule_content: newRuleContent,
          condition: newRuleCondition || null
        })
      })

      if (!res.ok) throw new Error('Failed to add rule')

      setNewRuleContent('')
      setNewRuleCondition('')
      await fetchAgent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add rule')
    }
  }

  // Delete rule
  async function deleteRule(ruleId: string) {
    try {
      const res = await fetch(`/api/admin/agents/${id}/rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete rule')
      await fetchAgent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    }
  }

  // Toggle rule enabled
  async function toggleRuleEnabled(rule: AgentRule) {
    try {
      const res = await fetch(`/api/admin/agents/${id}/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !rule.is_enabled })
      })

      if (!res.ok) throw new Error('Failed to update rule')
      await fetchAgent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule')
    }
  }

  // Create version
  async function createVersion(changeType: string, changeDescription?: string) {
    try {
      const res = await fetch(`/api/admin/agents/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_type: changeType, change_description: changeDescription })
      })

      if (!res.ok) throw new Error('Failed to create version')
      await fetchAgent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create version')
    }
  }

  // Publish version
  async function publishVersion(version: number) {
    try {
      const res = await fetch(`/api/admin/agents/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      })

      if (!res.ok) throw new Error('Failed to publish version')
      await fetchAgent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish version')
    }
  }

  // Export config
  async function exportConfig() {
    window.open(`/api/admin/agents/${id}/export?format=download`, '_blank')
  }

  // Copy config to clipboard
  async function copyConfig() {
    if (sdkConfig) {
      await navigator.clipboard.writeText(JSON.stringify(sdkConfig, null, 2))
    }
  }

  // Create schedule
  async function createSchedule() {
    if (!newScheduleName.trim() || !newSchedulePrompt.trim()) return

    setCreatingSchedule(true)
    try {
      const res = await fetch(`/api/admin/agents/${id}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newScheduleName,
          description: newScheduleDescription || null,
          cron_expression: newScheduleCron,
          task_prompt: newSchedulePrompt,
          requires_approval: newScheduleRequiresApproval
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create schedule')
      }

      // Reset form and refresh
      setNewScheduleName('')
      setNewScheduleDescription('')
      setNewSchedulePreset('daily')
      setNewScheduleCron('0 9 * * *')
      setNewSchedulePrompt('')
      setNewScheduleRequiresApproval(false)
      setShowCreateSchedule(false)
      fetchSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule')
    } finally {
      setCreatingSchedule(false)
    }
  }

  // Toggle schedule enabled
  async function toggleSchedule(scheduleId: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/admin/agents/${id}/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: enabled })
      })

      if (!res.ok) throw new Error('Failed to update schedule')
      fetchSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule')
    }
  }

  // Delete schedule
  async function deleteSchedule(scheduleId: string) {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    try {
      const res = await fetch(`/api/admin/agents/${id}/schedules/${scheduleId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete schedule')
      fetchSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule')
    }
  }

  // Run schedule now
  async function runScheduleNow(scheduleId: string) {
    try {
      const res = await fetch(`/api/admin/agents/${id}/schedules/${scheduleId}/run`, {
        method: 'POST'
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to run schedule')
      }

      const data = await res.json()
      alert(data.message || 'Schedule executed')
      fetchSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run schedule')
    }
  }

  // Toggle tool selection
  function toggleTool(toolId: string) {
    setSelectedToolIds(prev => {
      const next = new Set(prev)
      if (next.has(toolId)) {
        next.delete(toolId)
      } else {
        next.add(toolId)
      }
      return next
    })
  }

  // Toggle skill selection
  function toggleSkill(skillId: string) {
    setSelectedSkillIds(prev => {
      const next = new Set(prev)
      if (next.has(skillId)) {
        next.delete(skillId)
      } else {
        next.add(skillId)
      }
      return next
    })
  }

  // Toggle mind selection
  function toggleMind(mindId: string) {
    setSelectedMindIds(prev => {
      const next = new Set(prev)
      if (next.has(mindId)) {
        next.delete(mindId)
      } else {
        next.add(mindId)
      }
      return next
    })
  }

  // Filter tools
  const filteredTools = allTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      (tool.description?.toLowerCase().includes(toolSearch.toLowerCase()))
    const matchesCategory = toolCategory === 'all' || tool.category === toolCategory
    return matchesSearch && matchesCategory
  })

  const filteredMind = allMind.filter(mind => {
    const matchesCategory = mindCategory === 'all' || mind.category === mindCategory
    return matchesCategory
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Agent not found</p>
        <Button variant="link" onClick={() => router.push('/admin/agents')}>
          Back to Agents
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/agents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              {agent.is_head && <Badge variant="secondary">Head</Badge>}
              <Badge variant="outline">v{agent.current_version}</Badge>
              {agent.published_version && (
                <Badge variant="default">Published: v{agent.published_version}</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{agent.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowVersions(!showVersions)}>
            <History className="h-4 w-4 mr-2" />
            Versions
          </Button>
          <Button variant="outline" size="sm" onClick={exportConfig}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Preview Config
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Agent SDK Configuration</DialogTitle>
                <DialogDescription>
                  This is the configuration that will be used with the Anthropic Agent SDK
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[500px]">
                <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto">
                  {JSON.stringify(sdkConfig, null, 2)}
                </pre>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={copyConfig}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex w-full flex-nowrap gap-2 overflow-x-auto">
              <TabsTrigger value="identity" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Identity
              </TabsTrigger>
              <TabsTrigger value="tools" className="flex items-center gap-1 flex-shrink-0">
                <Wrench className="h-4 w-4" />
                Tools
                <Badge variant="secondary" className="ml-1">{selectedToolIds.size}</Badge>
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex items-center gap-1 flex-shrink-0">
                <BookOpen className="h-4 w-4" />
                Skills
                <Badge variant="secondary" className="ml-1">{selectedSkillIds.size}</Badge>
              </TabsTrigger>
              <TabsTrigger value="mind" className="flex items-center gap-1 flex-shrink-0">
                <Brain className="h-4 w-4" />
                Mind
                <Badge variant="secondary" className="ml-1">{selectedMindIds.size}</Badge>
              </TabsTrigger>
              <TabsTrigger value="prompt" className="flex items-center gap-1 flex-shrink-0">
                <FileText className="h-4 w-4" />
                Prompt
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-1 flex-shrink-0">
                <Users className="h-4 w-4" />
                Team
                <Badge variant="secondary" className="ml-1">{delegations.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-1 flex-shrink-0">
                <Shield className="h-4 w-4" />
                Rules
                <Badge variant="secondary" className="ml-1">{rules.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="schedules" className="flex items-center gap-1 flex-shrink-0">
                <Calendar className="h-4 w-4" />
                Schedules
                <Badge variant="secondary" className="ml-1">{schedules.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Identity Tab */}
            <TabsContent value="identity">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Identity</CardTitle>
                  <CardDescription>Configure the core identity and settings for this agent</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug</Label>
                      <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated-from-name" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                    <p className="text-xs text-muted-foreground">Internal description for admin use</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userDescription">User Description</Label>
                    <Textarea
                      id="userDescription"
                      value={userDescription}
                      onChange={e => setUserDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe what this agent does for end users..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown to users in the mobile/web app to explain what this agent can help with
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDER_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select value={model} onValueChange={(v) => setModel(v as AgentModel)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODEL_OPTIONS_BY_PROVIDER[provider].map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Permission Mode</Label>
                      <Select value={permissionMode} onValueChange={(v) => setPermissionMode(v as PermissionMode)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERMISSION_MODE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div>
                                <div>{opt.label}</div>
                                <div className="text-xs text-muted-foreground">{opt.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Plan</Label>
                      <Select value={planId} onValueChange={setPlanId}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Plans" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">All Plans (No Restriction)</SelectItem>
                          {plans.map(plan => (
                            <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Turns: {maxTurns}</Label>
                      <Slider
                        value={[maxTurns]}
                        onValueChange={([v]) => setMaxTurns(v)}
                        min={1}
                        max={50}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="is-head" checked={isHead} onCheckedChange={(v) => setIsHead(!!v)} />
                      <Label htmlFor="is-head">Department Head</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Department heads coordinate other agents in their department
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveIdentity} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Identity
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tool Assignments</CardTitle>
                      <CardDescription>Select which tools this agent can use ({selectedToolIds.size} selected)</CardDescription>
                    </div>
                    <Button onClick={saveTools} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Tools
                    </Button>
                  </div>
                  {tokenEstimates && selectedToolIds.size > 30 && (
                    <div className="mt-3 flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200">High tool count detected</p>
                        <p className="text-amber-700 dark:text-amber-300">
                          This agent has {selectedToolIds.size} tools assigned, estimated at ~{tokenEstimates.tools.toLocaleString()} tokens per message.
                          Consider reducing tools for cost efficiency. Agents with 20-30 tools typically perform better.
                        </p>
                      </div>
                    </div>
                  )}
                  {tokenEstimates && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Token estimates: ~{tokenEstimates.tools.toLocaleString()} for tools, ~{tokenEstimates.systemPrompt.toLocaleString()} for prompt, ~{tokenEstimates.total.toLocaleString()} total base cost per message
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      placeholder="Search tools..."
                      value={toolSearch}
                      onChange={e => setToolSearch(e.target.value)}
                      className="max-w-sm"
                    />
                    <Select value={toolCategory} onValueChange={setToolCategory}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {TOOL_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const categoryTools = filteredTools.map(t => t.id)
                        setSelectedToolIds(prev => new Set([...prev, ...categoryTools]))
                      }}
                    >
                      Select All Filtered
                    </Button>
                  </div>

                  <ScrollArea className="h-[400px] border rounded-md">
                    <div className="p-4 space-y-2">
                      {filteredTools.map(tool => (
                        <div
                          key={tool.id}
                          className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedToolIds.has(tool.id) ? 'bg-primary/5 border-primary' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleTool(tool.id)}
                        >
                          <Checkbox checked={selectedToolIds.has(tool.id)} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{tool.name}</span>
                              <Badge variant="outline" className="text-xs">{tool.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{tool.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Schema Validation Section */}
                  <div className="mt-4 border rounded-md">
                    <div className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                      <button
                        type="button"
                        className="flex items-center gap-2"
                        onClick={() => setShowValidation(!showValidation)}
                      >
                        <FileCheck className="h-4 w-4" />
                        <span className="font-medium">Schema Validation</span>
                        {showValidation ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={selectedToolIds.size === 0 || isValidating}
                          onClick={() => {
                            setIsValidating(true)
                            const selectedTools = allTools.filter(t => selectedToolIds.has(t.id))
                            const results = validateToolSchemas(selectedTools)
                            setValidationResults(results)
                            setShowValidation(true)
                            setIsValidating(false)
                          }}
                        >
                          {isValidating ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <FileCheck className="h-3 w-3 mr-1" />
                          )}
                          Validate Schema
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={selectedToolIds.size === 0 || isProductionTesting}
                          onClick={async () => {
                            setIsProductionTesting(true)
                            setProductionResults([])
                            setProductionProgress({ completed: 0, total: selectedToolIds.size })
                            setShowValidation(true)

                            try {
                              const response = await fetch('/api/admin/agents/tools/test', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tool_ids: Array.from(selectedToolIds), provider, model })
                              })
                              const data = await response.json()
                              if (data.results) {
                                setProductionResults(data.results)
                                setProductionProgress({ completed: data.results.length, total: data.results.length })
                              } else if (data.error) {
                                console.error('Production test error:', data.error)
                              }
                            } catch (err) {
                              console.error('Production test failed:', err)
                            } finally {
                              setIsProductionTesting(false)
                            }
                          }}
                        >
                          {isProductionTesting ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          {isProductionTesting
                            ? `Testing ${productionProgress.completed}/${productionProgress.total}...`
                            : 'Run Production Test'}
                        </Button>
                      </div>
                    </div>

                    {showValidation && (
                      <div className="border-t p-4 space-y-4">
                        {validationResults.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Click &quot;Validate Tools&quot; to check selected tools for schema issues
                          </p>
                        ) : (
                          <>
                            {/* Summary badges */}
                            <div className="flex items-center gap-2">
                              {(() => {
                                const summary = getValidationSummary(validationResults)
                                return (
                                  <>
                                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      {summary.passed} Passed
                                    </Badge>
                                    {summary.withWarnings > 0 && (
                                      <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {summary.withWarnings} Warnings
                                      </Badge>
                                    )}
                                    {summary.failed > 0 && (
                                      <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {summary.failed} Errors
                                      </Badge>
                                    )}
                                  </>
                                )
                              })()}
                            </div>

                            {/* Results table */}
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tool Name</TableHead>
                                  <TableHead className="w-[100px]">Status</TableHead>
                                  <TableHead>Issues</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {validationResults.map(result => (
                                  <TableRow key={result.toolId}>
                                    <TableCell className="font-medium">{result.toolName}</TableCell>
                                    <TableCell>
                                      {result.isValid && result.warnings.length === 0 ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      ) : result.isValid && result.warnings.length > 0 ? (
                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {result.errors.length === 0 && result.warnings.length === 0 ? (
                                        <span className="text-muted-foreground">-</span>
                                      ) : (
                                        <div className="space-y-1">
                                          {result.errors.map((err, i) => (
                                            <div key={`err-${i}`} className="text-xs text-red-600">
                                              <span className="font-medium">{err.field}:</span> {err.message}
                                            </div>
                                          ))}
                                          {result.warnings.map((warn, i) => (
                                            <div key={`warn-${i}`} className="text-xs text-amber-600">
                                              <span className="font-medium">{warn.field}:</span> {warn.message}
                                              {warn.recommendation && (
                                                <span className="text-muted-foreground block ml-4 italic">
                                                  {warn.recommendation}
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </>
                        )}

                        {/* Production Test Results */}
                        {(productionResults.length > 0 || isProductionTesting) && (
                          <div className="mt-6 pt-6 border-t">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium flex items-center gap-2">
                                <Play className="h-4 w-4" />
                                Production Test Results
                              </h4>
                              {isProductionTesting && (
                                <span className="text-sm text-muted-foreground">
                                  Testing {productionProgress.completed}/{productionProgress.total} tools...
                                </span>
                              )}
                            </div>

                            {productionResults.length > 0 && (
                              <>
                                {/* Summary badges */}
                                <div className="flex items-center gap-2 mb-4">
                                  {(() => {
                                    const summary = getProductionTestSummary(productionResults)
                                    const failures = productionResults.filter(r => !r.success)
                                    return (
                                      <>
                                        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          {summary.passed} Passed
                                        </Badge>
                                        {summary.failed > 0 && (
                                          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                            <XCircle className="h-3 w-3 mr-1" />
                                            {summary.failed} Failed
                                          </Badge>
                                        )}
                                        {failures.length > 0 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="ml-2 h-6 text-xs"
                                            onClick={() => {
                                              const failureData = failures.map(f => ({
                                                toolId: f.toolId,
                                                toolName: f.toolName,
                                                success: f.success,
                                                toolUseReturned: f.toolUseReturned,
                                                inputValid: f.inputValid,
                                                latencyMs: f.latencyMs,
                                                error: f.error,
                                                toolInput: f.toolInput
                                              }))
                                              navigator.clipboard.writeText(JSON.stringify(failureData, null, 2))
                                            }}
                                          >
                                            <Copy className="h-3 w-3 mr-1" />
                                            Copy Failures JSON
                                          </Button>
                                        )}
                                      </>
                                    )
                                  })()}
                                </div>

                                {/* Results table */}
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Tool Name</TableHead>
                                      <TableHead className="w-[80px]">Invoked</TableHead>
                                      <TableHead className="w-[80px]">Valid Input</TableHead>
                                      <TableHead className="w-[80px]">Latency</TableHead>
                                      <TableHead>Error</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {productionResults.map(result => (
                                      <TableRow key={result.toolId}>
                                        <TableCell className="font-medium">{result.toolName}</TableCell>
                                        <TableCell>
                                          {result.toolUseReturned ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {result.toolUseReturned ? (
                                            result.inputValid ? (
                                              <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                              <XCircle className="h-4 w-4 text-red-600" />
                                            )
                                          ) : (
                                            <span className="text-muted-foreground">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <span className="text-sm text-muted-foreground">
                                            {result.latencyMs}ms
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          {result.error ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-red-600 flex-1">{result.error}</span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 shrink-0"
                                                onClick={() => {
                                                  const resultData = {
                                                    toolId: result.toolId,
                                                    toolName: result.toolName,
                                                    success: result.success,
                                                    toolUseReturned: result.toolUseReturned,
                                                    inputValid: result.inputValid,
                                                    latencyMs: result.latencyMs,
                                                    error: result.error,
                                                    toolInput: result.toolInput
                                                  }
                                                  navigator.clipboard.writeText(JSON.stringify(resultData, null, 2))
                                                }}
                                                title="Copy JSON"
                                              >
                                                <Copy className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground">-</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </>
                            )}

                            {isProductionTesting && productionResults.length === 0 && (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-muted-foreground">Running production tests...</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* MCP Execution Test Section */}
                        <div className="mt-6 pt-6 border-t">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              MCP Execution Test
                              <Badge variant="outline" className="text-xs font-normal">Real Tool Execution</Badge>
                            </h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Test tools by executing them on the MCP server with real database operations. Select a workspace context for the test.
                          </p>

                          <div className="flex items-center gap-2 mb-4">
                            <Select value={testWorkspaceId} onValueChange={setTestWorkspaceId}>
                              <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Select workspace for testing" />
                              </SelectTrigger>
                              <SelectContent>
                                {workspaces.map(ws => (
                                  <SelectItem key={ws.id} value={ws.id}>
                                    {ws.name} ({ws.slug})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={selectedToolIds.size === 0 || isMcpTesting || !testWorkspaceId}
                              onClick={async () => {
                                if (!testWorkspaceId) {
                                  return
                                }
                                setIsMcpTesting(true)
                                setMcpTestResults([])
                                setMcpTestProgress({ completed: 0, total: selectedToolIds.size })

                                try {
                                  const response = await fetch('/api/admin/agents/tools/test-production', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      tool_ids: Array.from(selectedToolIds),
                                      workspace_id: testWorkspaceId
                                    })
                                  })
                                  const data = await response.json()
                                  if (data.results) {
                                    setMcpTestResults(data.results)
                                    setMcpTestProgress({ completed: data.results.length, total: data.results.length })
                                  } else if (data.error) {
                                    console.error('MCP test error:', data.error)
                                  }
                                } catch (err) {
                                  console.error('MCP test failed:', err)
                                } finally {
                                  setIsMcpTesting(false)
                                }
                              }}
                            >
                              {isMcpTesting ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Wrench className="h-3 w-3 mr-1" />
                              )}
                              {isMcpTesting
                                ? `Testing ${mcpTestProgress.completed}/${mcpTestProgress.total}...`
                                : 'Run MCP Test'}
                            </Button>
                          </div>

                          {mcpTestResults.length > 0 && (
                            <>
                              {/* Summary badges */}
                              <div className="flex items-center gap-2 mb-4">
                                {(() => {
                                  const summary = getMCPTestSummary(mcpTestResults)
                                  const failures = mcpTestResults.filter(r => !r.success)
                                  return (
                                    <>
                                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {summary.passed} Passed
                                      </Badge>
                                      {summary.failed > 0 && (
                                        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                          <XCircle className="h-3 w-3 mr-1" />
                                          {summary.failed} Failed
                                        </Badge>
                                      )}
                                      {failures.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="ml-2 h-6 text-xs"
                                          onClick={() => {
                                            const failureData = failures.map(f => ({
                                              toolId: f.toolId,
                                              toolName: f.toolName,
                                              success: f.success,
                                              latencyMs: f.latencyMs,
                                              error: f.error,
                                              result: f.result
                                            }))
                                            navigator.clipboard.writeText(JSON.stringify(failureData, null, 2))
                                          }}
                                        >
                                          <Copy className="h-3 w-3 mr-1" />
                                          Copy Failures JSON
                                        </Button>
                                      )}
                                    </>
                                  )
                                })()}
                              </div>

                              {/* Results table */}
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Tool Name</TableHead>
                                    <TableHead className="w-[80px]">Success</TableHead>
                                    <TableHead className="w-[80px]">Latency</TableHead>
                                    <TableHead>Result / Error</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {mcpTestResults.map(result => (
                                    <TableRow key={result.toolId}>
                                      <TableCell className="font-medium">{result.toolName}</TableCell>
                                      <TableCell>
                                        {result.success ? (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-600" />
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                          {result.latencyMs}ms
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        {result.error ? (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-red-600 flex-1">{result.error}</span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 shrink-0"
                                              onClick={() => {
                                                const resultData = {
                                                  toolId: result.toolId,
                                                  toolName: result.toolName,
                                                  success: result.success,
                                                  latencyMs: result.latencyMs,
                                                  error: result.error,
                                                  result: result.result
                                                }
                                                navigator.clipboard.writeText(JSON.stringify(resultData, null, 2))
                                              }}
                                              title="Copy JSON"
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ) : result.result ? (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-green-600 flex-1 truncate max-w-[300px]">
                                              {typeof result.result === 'string'
                                                ? result.result
                                                : JSON.stringify(result.result).substring(0, 100)}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 shrink-0"
                                              onClick={() => {
                                                navigator.clipboard.writeText(JSON.stringify(result.result, null, 2))
                                              }}
                                              title="Copy Result"
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </>
                          )}

                          {isMcpTesting && mcpTestResults.length === 0 && (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-muted-foreground">Running MCP execution tests...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Skill Assignments</CardTitle>
                      <CardDescription>Select which skills this agent should use ({selectedSkillIds.size} selected)</CardDescription>
                    </div>
                    <Button onClick={saveSkills} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Skills
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] border rounded-md">
                    <div className="p-4 space-y-2">
                      {allSkills.map(skill => (
                        <div
                          key={skill.id}
                          className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedSkillIds.has(skill.id) ? 'bg-primary/5 border-primary' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleSkill(skill.id)}
                        >
                          <Checkbox checked={selectedSkillIds.has(skill.id)} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{skill.name}</span>
                              <Badge variant="outline" className="text-xs">{skill.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{skill.description}</p>
                          </div>
                        </div>
                      ))}
                      {allSkills.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No skills available. Create skills in the Skills section.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mind Tab */}
            <TabsContent value="mind">
              <div className="space-y-6">
                {agent?.workspace_id && companyMind.length > 0 && (
                  <Card className="border-green-200 dark:border-green-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-lg">Company Knowledge</CardTitle>
                        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Inherited
                        </Badge>
                        <Lock className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                      <CardDescription>
                        Knowledge shared by all agents in this workspace. Automatically included.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {companyMind.map(mind => (
                          <div key={mind.id} className="flex items-start gap-3 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{mind.name}</span>
                                <Badge variant="outline" className="text-xs">{MIND_CATEGORY_LABELS[mind.category]}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{mind.description || 'No description'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {mind.content.length} characters | ~{Math.ceil(mind.content.length / 4)} tokens
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {agent?.workspace_id && agent?.department_id && departmentMind.length > 0 && (
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">Department Knowledge</CardTitle>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Inherited
                        </Badge>
                        <Lock className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                      <CardDescription>
                        Knowledge shared by all agents in {agent?.department?.name || 'this department'}. Automatically included.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {departmentMind.map(mind => (
                          <div key={mind.id} className="flex items-start gap-3 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{mind.name}</span>
                                <Badge variant="outline" className="text-xs">{MIND_CATEGORY_LABELS[mind.category]}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{mind.description || 'No description'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {mind.content.length} characters | ~{Math.ceil(mind.content.length / 4)} tokens
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-purple-200 dark:border-purple-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-600" />
                        <CardTitle className="text-lg">Agent Knowledge</CardTitle>
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {selectedMindIds.size} selected
                        </Badge>
                      </div>
                      <Button onClick={saveMind} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Mind
                      </Button>
                    </div>
                    <CardDescription>
                      Knowledge specific to this agent. Select which mind files to include.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <Select value={mindCategory} onValueChange={setMindCategory}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {MIND_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <ScrollArea className="h-[300px] border rounded-md">
                      <div className="p-4 space-y-2">
                        {filteredMind.map(mind => (
                          <div
                            key={mind.id}
                            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                              selectedMindIds.has(mind.id) ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-400' : 'hover:bg-muted'
                            }`}
                            onClick={() => toggleMind(mind.id)}
                          >
                            <Checkbox checked={selectedMindIds.has(mind.id)} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{mind.name}</span>
                                <Badge variant="outline" className="text-xs">{MIND_CATEGORY_LABELS[mind.category]}</Badge>
                                <Badge variant="secondary" className="text-xs">{MIND_CONTENT_TYPE_LABELS[mind.content_type]}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{mind.description || 'No description'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {mind.content.length} characters | ~{Math.ceil(mind.content.length / 4)} tokens
                              </p>
                            </div>
                          </div>
                        ))}
                        {filteredMind.length === 0 && (
                          <p className="text-center text-muted-foreground py-8">
                            No agent-scoped mind files available. Create mind files with &quot;Agent&quot; scope in the Mind section.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {agentLearnings.length > 0 && (
                  <Card className="border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-lg">Active Learnings</CardTitle>
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          {agentLearnings.length} insights
                        </Badge>
                      </div>
                      <CardDescription>
                        Dynamic insights learned from experience. These are automatically included in the agent&apos;s context.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {agentLearnings.map(learning => (
                          <div key={learning.id} className="flex items-start gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{learning.title}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    learning.scope === 'company' ? 'bg-green-100 text-green-800' :
                                    learning.scope === 'department' ? 'bg-blue-100 text-blue-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {MIND_SCOPE_LABELS[learning.scope]}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{learning.insight}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Confidence: {Math.round(learning.confidence_score * 100)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Prompt Tab */}
            <TabsContent value="prompt">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>System Prompt</CardTitle>
                      <CardDescription>Configure the agent&apos;s system prompt</CardDescription>
                    </div>
                    <Button onClick={saveIdentity} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Prompt
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    className="font-mono min-h-[400px]"
                    placeholder="You are a helpful AI assistant..."
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {systemPrompt.length} characters | ~{Math.ceil(systemPrompt.length / 4)} tokens
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Agent Delegations</CardTitle>
                      <CardDescription>Configure which agents this agent can delegate to</CardDescription>
                    </div>
                    <Button onClick={saveDelegations} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Delegations
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {delegations.map((delegation, index) => (
                    <div key={index} className="flex gap-4 items-start p-4 border rounded-md">
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <Label>Delegate To</Label>
                          <Select
                            value={delegation.to_agent_id}
                            onValueChange={v => {
                              const newDelegations = [...delegations]
                              newDelegations[index].to_agent_id = v
                              setDelegations(newDelegations)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {allAgents.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Condition (when to delegate)</Label>
                          <Input
                            value={delegation.condition}
                            onChange={e => {
                              const newDelegations = [...delegations]
                              newDelegations[index].condition = e.target.value
                              setDelegations(newDelegations)
                            }}
                            placeholder="e.g., when user asks about finance"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Context Template</Label>
                          <Textarea
                            value={delegation.context_template}
                            onChange={e => {
                              const newDelegations = [...delegations]
                              newDelegations[index].context_template = e.target.value
                              setDelegations(newDelegations)
                            }}
                            placeholder="Context to pass to the delegated agent"
                            rows={2}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDelegations(delegations.filter((_, i) => i !== index))
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={() => {
                      setDelegations([...delegations, { to_agent_id: '', condition: '', context_template: '' }])
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Delegation
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rules Tab */}
            <TabsContent value="rules">
              <Card>
                <CardHeader>
                  <CardTitle>Behavioral Rules</CardTitle>
                  <CardDescription>Define rules the agent must follow</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Rule Form */}
                  <div className="p-4 border rounded-md space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Rule Type</Label>
                        <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as RuleType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RULE_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                <div>
                                  <div>{type.label}</div>
                                  <div className="text-xs text-muted-foreground">{type.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {newRuleType === 'when' && (
                        <div className="space-y-2">
                          <Label>Condition</Label>
                          <Input
                            value={newRuleCondition}
                            onChange={e => setNewRuleCondition(e.target.value)}
                            placeholder="e.g., user mentions competitor"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Rule Content</Label>
                      <Textarea
                        value={newRuleContent}
                        onChange={e => setNewRuleContent(e.target.value)}
                        placeholder={
                          newRuleType === 'always' ? 'e.g., verify data before responding' :
                          newRuleType === 'never' ? 'e.g., share internal pricing' :
                          newRuleType === 'when' ? 'e.g., redirect to our advantages' :
                          'e.g., standard greeting response'
                        }
                        rows={2}
                      />
                    </div>
                    <Button onClick={addRule}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rule
                    </Button>
                  </div>

                  {/* Rules List */}
                  <div className="space-y-2">
                    {rules.map(rule => (
                      <div
                        key={rule.id}
                        className={`flex items-start gap-3 p-3 border rounded-md ${!rule.is_enabled ? 'opacity-50' : ''}`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              rule.rule_type === 'always' ? 'default' :
                              rule.rule_type === 'never' ? 'destructive' :
                              'secondary'
                            }>
                              {rule.rule_type}
                            </Badge>
                            {rule.condition && (
                              <span className="text-sm text-muted-foreground">
                                When: {rule.condition}
                              </span>
                            )}
                          </div>
                          <p className="text-sm mt-1">{rule.rule_content}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_enabled}
                            onCheckedChange={() => toggleRuleEnabled(rule)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {rules.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No rules defined. Add rules to guide agent behavior.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schedules Tab */}
            <TabsContent value="schedules">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Scheduled Tasks</CardTitle>
                      <CardDescription>Configure recurring tasks for this agent</CardDescription>
                    </div>
                    <Dialog open={showCreateSchedule} onOpenChange={setShowCreateSchedule}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Schedule
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Create Schedule</DialogTitle>
                          <DialogDescription>
                            Configure when this agent should automatically run a task
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={newScheduleName}
                              onChange={(e) => setNewScheduleName(e.target.value)}
                              placeholder="e.g., Weekly Report"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description (optional)</Label>
                            <Input
                              value={newScheduleDescription}
                              onChange={(e) => setNewScheduleDescription(e.target.value)}
                              placeholder="Brief description of the task"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Schedule</Label>
                            <Select
                              value={newSchedulePreset}
                              onValueChange={(val) => {
                                setNewSchedulePreset(val)
                                const preset = SCHEDULE_PRESETS.find(p => p.value === val)
                                if (preset && preset.cron) {
                                  setNewScheduleCron(preset.cron)
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SCHEDULE_PRESETS.map((preset) => (
                                  <SelectItem key={preset.value} value={preset.value}>
                                    {preset.label} - {preset.description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {newSchedulePreset === 'custom' && (
                            <div className="space-y-2">
                              <Label>Cron Expression</Label>
                              <Input
                                value={newScheduleCron}
                                onChange={(e) => setNewScheduleCron(e.target.value)}
                                placeholder="0 9 * * *"
                              />
                              <p className="text-xs text-muted-foreground">
                                Format: minute hour day-of-month month day-of-week
                              </p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label>Task Prompt</Label>
                            <Textarea
                              value={newSchedulePrompt}
                              onChange={(e) => setNewSchedulePrompt(e.target.value)}
                              placeholder="What should the agent do when this runs?"
                              rows={4}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={newScheduleRequiresApproval}
                              onCheckedChange={setNewScheduleRequiresApproval}
                            />
                            <Label>Require approval before running</Label>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowCreateSchedule(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={createSchedule}
                            disabled={creatingSchedule || !newScheduleName.trim() || !newSchedulePrompt.trim()}
                          >
                            {creatingSchedule ? 'Creating...' : 'Create Schedule'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {schedules.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Schedule</TableHead>
                          <TableHead>Next Run</TableHead>
                          <TableHead>Last Run</TableHead>
                          <TableHead>Approval</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.map((schedule) => (
                          <TableRow
                            key={schedule.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/admin/agents/${id}/schedules/${schedule.id}`)}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">{schedule.name}</div>
                                {schedule.description && (
                                  <div className="text-sm text-muted-foreground">{schedule.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {describeCron(schedule.cron_expression)}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {schedule.cron_expression}
                              </div>
                            </TableCell>
                            <TableCell>
                              {schedule.next_run_at ? (
                                <div className="text-sm">
                                  {new Date(schedule.next_run_at).toLocaleString()}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {schedule.last_run_at ? (
                                <div className="text-sm">
                                  {new Date(schedule.last_run_at).toLocaleString()}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Never</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {schedule.requires_approval ? (
                                <Badge variant="outline">Required</Badge>
                              ) : (
                                <Badge variant="secondary">Auto</Badge>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={schedule.is_enabled}
                                onCheckedChange={(checked) => toggleSchedule(schedule.id, checked)}
                              />
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => runScheduleNow(schedule.id)}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSchedule(schedule.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No scheduled tasks yet. Create one to automate this agent.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>

        {/* Version Sidebar */}
        {showVersions && (
          <Card className="w-80 shrink-0">
            <CardHeader>
              <CardTitle className="text-base">Version History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                size="sm"
                className="w-full"
                onClick={() => createVersion('identity', 'Manual snapshot')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Create Version
              </Button>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {versions.map(version => (
                    <div
                      key={version.id}
                      className={`p-3 border rounded-md ${version.is_published ? 'border-primary' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">v{version.version}</Badge>
                        {version.is_published && <Badge>Published</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {version.change_description || version.change_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(version.created_at).toLocaleDateString()}
                      </p>
                      {!version.is_published && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => publishVersion(version.version)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Publish
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

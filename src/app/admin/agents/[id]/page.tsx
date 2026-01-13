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
  Send,
  History,
  Upload,
  Download,
  Check,
  Copy,
  Bot,
  Loader2,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
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
  PermissionMode,
  AgentTestSession,
  AgentTestMessage,
  AgentSchedule,
  AgentScheduleExecution
} from '@/types/agents'
import { SCHEDULE_PRESETS, EXECUTION_STATUS_LABELS } from '@/types/agents'
import { describeCron } from '@/lib/cron-utils'

const MODEL_OPTIONS: { value: AgentModel; label: string }[] = [
  { value: 'haiku', label: 'Claude 3.5 Haiku (Fast)' },
  { value: 'sonnet', label: 'Claude Sonnet 4 (Balanced)' },
  { value: 'opus', label: 'Claude Opus 4 (Most Capable)' }
]

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

export default function AgentBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Core state
  const [agent, setAgent] = useState<AgentWithRelations | null>(null)
  const [versions, setVersions] = useState<AgentVersion[]>([])
  const [sdkConfig, setSdkConfig] = useState<AgentSDKConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('identity')

  // All tools for picker
  const [allTools, setAllTools] = useState<AgentTool[]>([])
  const [allSkills, setAllSkills] = useState<{ id: string; name: string; description: string | null; category: string }[]>([])
  const [allAgents, setAllAgents] = useState<{ id: string; name: string; avatar_url: string | null }[]>([])

  // Identity tab state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState<AgentModel>('sonnet')
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('default')
  const [maxTurns, setMaxTurns] = useState(10)
  const [isHead, setIsHead] = useState(false)

  // Tools tab state
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set())
  const [toolSearch, setToolSearch] = useState('')
  const [toolCategory, setToolCategory] = useState<string>('all')

  // Skills tab state
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())

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

  // Test tab state
  const [testSession, setTestSession] = useState<AgentTestSession | null>(null)
  const [testMessages, setTestMessages] = useState<AgentTestMessage[]>([])
  const [testInput, setTestInput] = useState('')
  const [testLoading, setTestLoading] = useState(false)

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

      // Set form values
      setName(data.agent.name)
      setSlug(data.agent.slug || '')
      setDescription(data.agent.description || '')
      setModel(data.agent.model)
      setPermissionMode(data.agent.permission_mode)
      setMaxTurns(data.agent.max_turns)
      setIsHead(data.agent.is_head)
      setSystemPrompt(data.agent.system_prompt)

      // Set tools
      const toolIds = new Set<string>((data.agent.tools || []).map((t: { tool_id: string }) => t.tool_id))
      setSelectedToolIds(toolIds)

      // Set skills
      const skillIds = new Set<string>((data.agent.skills || []).map((s: { skill_id: string }) => s.skill_id))
      setSelectedSkillIds(skillIds)

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

  useEffect(() => {
    fetchAgent()
    fetchTools()
    fetchSkills()
    fetchAgents()
    fetchSchedules()
  }, [fetchAgent, fetchTools, fetchSkills, fetchAgents, fetchSchedules])

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
          model,
          permission_mode: permissionMode,
          max_turns: maxTurns,
          is_head: isHead,
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

  // Start test session
  async function startTestSession() {
    try {
      const res = await fetch(`/api/admin/agents/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_mode: 'mock' })
      })

      if (!res.ok) throw new Error('Failed to start test session')

      const data = await res.json()
      setTestSession(data.session)
      setTestMessages([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start test session')
    }
  }

  // Send test message
  async function sendTestMessage() {
    if (!testSession || !testInput.trim()) return

    setTestLoading(true)

    try {
      const res = await fetch(`/api/admin/agents/${id}/test/${testSession.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: testInput })
      })

      if (!res.ok) throw new Error('Failed to send message')

      const data = await res.json()

      // Add messages to list
      const newMessages: AgentTestMessage[] = []
      if (data.userMessage) newMessages.push(data.userMessage)
      if (data.toolCalls) newMessages.push(...data.toolCalls)
      if (data.assistantMessage) newMessages.push(data.assistantMessage)

      setTestMessages(prev => [...prev, ...newMessages])
      setTestInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setTestLoading(false)
    }
  }

  // End test session
  async function endTestSession() {
    if (!testSession) return

    try {
      const res = await fetch(`/api/admin/agents/${id}/test/${testSession.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!res.ok) throw new Error('Failed to end session')

      setTestSession(null)
      setTestMessages([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session')
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

  // Filter tools
  const filteredTools = allTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      (tool.description?.toLowerCase().includes(toolSearch.toLowerCase()))
    const matchesCategory = toolCategory === 'all' || tool.category === toolCategory
    return matchesSearch && matchesCategory
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
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="identity" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Identity
              </TabsTrigger>
              <TabsTrigger value="tools" className="flex items-center gap-1">
                <Wrench className="h-4 w-4" />
                Tools
                <Badge variant="secondary" className="ml-1">{selectedToolIds.size}</Badge>
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Skills
                <Badge variant="secondary" className="ml-1">{selectedSkillIds.size}</Badge>
              </TabsTrigger>
              <TabsTrigger value="prompt" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Prompt
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Team
                <Badge variant="secondary" className="ml-1">{delegations.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Rules
                <Badge variant="secondary" className="ml-1">{rules.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="schedules" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Schedules
                <Badge variant="secondary" className="ml-1">{schedules.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="test" className="flex items-center gap-1">
                <Play className="h-4 w-4" />
                Test
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
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select value={model} onValueChange={(v) => setModel(v as AgentModel)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODEL_OPTIONS.map(opt => (
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
                          <TableRow key={schedule.id}>
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
                            <TableCell>
                              <Switch
                                checked={schedule.is_enabled}
                                onCheckedChange={(checked) => toggleSchedule(schedule.id, checked)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
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

            {/* Test Tab */}
            <TabsContent value="test">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Test Sandbox</CardTitle>
                      <CardDescription>Test your agent before publishing</CardDescription>
                    </div>
                    {testSession ? (
                      <Button variant="outline" onClick={endTestSession}>End Session</Button>
                    ) : (
                      <Button onClick={startTestSession}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Test Session
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {testSession ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">Session Active</Badge>
                        <span>Version {testSession.version}</span>
                        <span>Turns: {testSession.total_turns}</span>
                      </div>

                      <ScrollArea className="h-[400px] border rounded-md p-4">
                        <div className="space-y-4">
                          {testMessages.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                            >
                              {msg.role !== 'user' && (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Bot className="h-4 w-4" />
                                </div>
                              )}
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : msg.role === 'tool_use'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border'
                                    : msg.role === 'tool_result'
                                    ? 'bg-green-100 dark:bg-green-900/30 border'
                                    : 'bg-muted'
                                }`}
                              >
                                {msg.tool_name && (
                                  <div className="text-xs font-medium mb-1 flex items-center gap-1">
                                    <Wrench className="h-3 w-3" />
                                    {msg.tool_name}
                                  </div>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                {msg.latency_ms && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {msg.latency_ms}ms
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          {testMessages.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">
                              Send a message to start testing
                            </p>
                          )}
                        </div>
                      </ScrollArea>

                      <div className="flex gap-2">
                        <Input
                          value={testInput}
                          onChange={e => setTestInput(e.target.value)}
                          placeholder="Type a message..."
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendTestMessage()}
                          disabled={testLoading}
                        />
                        <Button onClick={sendTestMessage} disabled={testLoading}>
                          {testLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Start a test session to interact with your agent
                      </p>
                      <Button onClick={startTestSession}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Test Session
                      </Button>
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

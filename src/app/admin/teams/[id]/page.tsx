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
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ArrowLeft,
  Save,
  Users,
  Bot,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  GripVertical,
  CreditCard,
  Link as LinkIcon,
  FileText,
  Search,
  Crown,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Settings,
  Rocket,
  RefreshCw,
  Building2,
  ArrowUpCircle,
  Eye
} from 'lucide-react'
import type { TeamWithRelations, TeamAgent, TeamDelegation, TeamMind, MindFile, WorkspaceDeployedTeamWithRelations, DEPLOYMENT_STATUS_COLORS, DEPLOYMENT_STATUS_LABELS } from '@/types/teams'
import { TeamOrgChart } from '@/components/admin/team-org-chart'

interface Agent {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  model: string
  is_enabled: boolean
}

interface Plan {
  id: string
  name: string
  slug: string
}

export default function TeamDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Core state
  const [team, setTeam] = useState<TeamWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // All agents for picker
  const [allAgents, setAllAgents] = useState<Agent[]>([])

  // Overview tab state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [headAgentId, setHeadAgentId] = useState<string>('')
  const [isActive, setIsActive] = useState(true)

  // Agents tab state
  const [teamAgents, setTeamAgents] = useState<TeamAgent[]>([])
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set())

  // Delegations tab state
  const [delegations, setDelegations] = useState<TeamDelegation[]>([])
  const [newFromAgentId, setNewFromAgentId] = useState('')
  const [newToAgentId, setNewToAgentId] = useState('')
  const [newCondition, setNewCondition] = useState('')
  const [newContextTemplate, setNewContextTemplate] = useState('')

  // Plans tab state (read-only)
  const [linkedPlans, setLinkedPlans] = useState<Plan[]>([])

  // Mind tab state
  const [teamMind, setTeamMind] = useState<TeamMind[]>([])
  const [allMind, setAllMind] = useState<MindFile[]>([])
  const [showMindDialog, setShowMindDialog] = useState(false)
  const [showCreateMindDialog, setShowCreateMindDialog] = useState(false)
  const [mindSearch, setMindSearch] = useState('')
  const [viewingMind, setViewingMind] = useState<MindFile | null>(null)

  // Deployments tab state
  const [deployments, setDeployments] = useState<WorkspaceDeployedTeamWithRelations[]>([])
  const [deploymentsLoading, setDeploymentsLoading] = useState(false)
  const [deploymentsTotal, setDeploymentsTotal] = useState(0)
  const [activeDeployments, setActiveDeployments] = useState(0)
  const [outdatedDeployments, setOutdatedDeployments] = useState(0)
  const [currentVersion, setCurrentVersion] = useState(1)
  const [showDeployDialog, setShowDeployDialog] = useState(false)
  const [deployingWorkspaceIds, setDeployingWorkspaceIds] = useState<string[]>([])
  const [allWorkspaces, setAllWorkspaces] = useState<{ id: string; name: string }[]>([])
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<Set<string>>(new Set())
  const [deploying, setDeploying] = useState(false)
  const [redeployingAll, setRedeployingAll] = useState(false)

  // Overview tab state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mindForm, setMindForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'knowledge',
    content: '',
    content_type: 'general',
    is_enabled: true,
    scope: 'agent' as const
  })

  // Fetch team data
  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/teams/${id}`)
      if (!res.ok) throw new Error('Team not found')

      const data = await res.json()
      const teamData = data.team

      setTeam(teamData)
      setName(teamData.name)
      setSlug(teamData.slug || '')
      setDescription(teamData.description || '')
      setHeadAgentId(teamData.head_agent_id || '')
      setIsActive(teamData.is_active)
      setTeamAgents(teamData.agents || [])
      setDelegations(teamData.delegations || [])
      setLinkedPlans(teamData.plans || [])
      setTeamMind(teamData.mind || [])

      // Set selected agent IDs
      const agentIds = new Set<string>((teamData.agents || []).map((a: TeamAgent) => a.agent_id))
      setSelectedAgentIds(agentIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }, [id])

  // Fetch all agents
  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/admin/agents')
    if (res.ok) {
      const data = await res.json()
      setAllAgents(data.agents || [])
    }
  }, [])

  // Fetch all mind files for assignment
  const fetchAllMind = useCallback(async () => {
    const res = await fetch('/api/admin/mind?include_workspace=true')
    if (res.ok) {
      const data = await res.json()
      setAllMind(data.mind || [])
    }
  }, [])

  // Fetch deployments
  const fetchDeployments = useCallback(async () => {
    setDeploymentsLoading(true)
    try {
      const res = await fetch(`/api/admin/teams/${id}/deployments`)
      if (res.ok) {
        const data = await res.json()
        setDeployments(data.deployments || [])
        setDeploymentsTotal(data.total || 0)
        setActiveDeployments(data.active_count || 0)
        setOutdatedDeployments(data.outdated_count || 0)
        setCurrentVersion(data.team?.current_version || 1)
      }
    } finally {
      setDeploymentsLoading(false)
    }
  }, [id])

  // Fetch all workspaces for deploy dialog
  const fetchWorkspaces = useCallback(async () => {
    const res = await fetch('/api/admin/workspaces')
    if (res.ok) {
      const data = await res.json()
      setAllWorkspaces(data.workspaces || [])
    }
  }, [])

  useEffect(() => {
    fetchTeam()
    fetchAgents()
    fetchAllMind()
  }, [fetchTeam, fetchAgents, fetchAllMind])

  // Fetch deployments when switching to deployments tab
  useEffect(() => {
    if (activeTab === 'deployments' && deployments.length === 0) {
      fetchDeployments()
      fetchWorkspaces()
    }
  }, [activeTab, deployments.length, fetchDeployments, fetchWorkspaces])

  // Save overview
  async function saveOverview() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/teams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description: description || null,
          head_agent_id: headAgentId || null,
          is_active: isActive
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      await fetchTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Save agents
  async function saveAgents() {
    setSaving(true)
    setError(null)

    try {
      const agents = Array.from(selectedAgentIds).map((agentId, index) => ({
        agent_id: agentId,
        role: agentId === headAgentId ? 'head' : 'member',
        display_order: index
      }))

      const res = await fetch(`/api/admin/teams/${id}/agents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save agents')
      }

      await fetchTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agents')
    } finally {
      setSaving(false)
    }
  }

  // Save delegations
  async function saveDelegations() {
    setSaving(true)
    setError(null)

    try {
      const delegationData = delegations.map(d => ({
        from_agent_id: d.from_agent_id,
        to_agent_id: d.to_agent_id,
        condition: d.condition || undefined,
        context_template: d.context_template || undefined
      }))

      const res = await fetch(`/api/admin/teams/${id}/delegations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegations: delegationData })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save delegations')
      }

      await fetchTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save delegations')
    } finally {
      setSaving(false)
    }
  }

  // Toggle agent selection
  function toggleAgent(agentId: string) {
    setSelectedAgentIds(prev => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
        // Clear head agent if removed
        if (headAgentId === agentId) {
          setHeadAgentId('')
        }
      } else {
        next.add(agentId)
      }
      return next
    })
  }

  // Add delegation
  function addDelegation() {
    if (!newFromAgentId || !newToAgentId || newFromAgentId === newToAgentId) return

    setDelegations(prev => [...prev, {
      id: `temp-${Date.now()}`,
      team_id: id,
      from_agent_id: newFromAgentId,
      to_agent_id: newToAgentId,
      condition: newCondition || null,
      context_template: newContextTemplate || null,
      created_at: new Date().toISOString(),
      from_agent: allAgents.find(a => a.id === newFromAgentId),
      to_agent: allAgents.find(a => a.id === newToAgentId)
    }])

    setNewFromAgentId('')
    setNewToAgentId('')
    setNewCondition('')
    setNewContextTemplate('')
  }

  // Remove delegation
  function removeDelegation(index: number) {
    setDelegations(prev => prev.filter((_, i) => i !== index))
  }

  // Mind functions
  async function assignMindToTeam(mindId: string) {
    const currentMindIds = teamMind.map(tm => tm.mind_id)
    if (currentMindIds.includes(mindId)) return

    setSaving(true)
    const res = await fetch(`/api/admin/teams/${id}/mind`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mind_ids: [...currentMindIds, mindId] })
    })

    if (res.ok) {
      await fetchTeam()
    }
    setSaving(false)
    setShowMindDialog(false)
  }

  async function removeMindFromTeam(mindId: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/teams/${id}/mind?mind_id=${mindId}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      await fetchTeam()
    }
    setSaving(false)
  }

  async function toggleMindEnabled(mindId: string, currentEnabled: boolean) {
    const res = await fetch(`/api/admin/mind/${mindId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !currentEnabled })
    })

    if (res.ok) {
      await fetchTeam()
      await fetchAllMind()
    }
  }

  async function createMindForTeam() {
    if (!mindForm.name || !mindForm.category || !mindForm.content) return

    setSaving(true)
    const res = await fetch(`/api/admin/teams/${id}/mind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mindForm)
    })

    if (res.ok) {
      setShowCreateMindDialog(false)
      setMindForm({
        name: '',
        slug: '',
        description: '',
        category: 'knowledge',
        content: '',
        content_type: 'general',
        is_enabled: true,
        scope: 'agent'
      })
      await fetchTeam()
      await fetchAllMind()
    }
    setSaving(false)
  }

  // Deploy to selected workspaces
  async function deployToWorkspaces() {
    if (selectedWorkspaceIds.size === 0) return
    setDeploying(true)

    try {
      const res = await fetch(`/api/admin/teams/${id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_ids: Array.from(selectedWorkspaceIds) })
      })

      if (res.ok) {
        setShowDeployDialog(false)
        setSelectedWorkspaceIds(new Set())
        await fetchDeployments()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to deploy')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy')
    } finally {
      setDeploying(false)
    }
  }

  // Upgrade all outdated deployments
  async function redeployAll() {
    setRedeployingAll(true)

    try {
      // Get all active deployments that are outdated
      const outdated = deployments.filter(
        d => d.status === 'active' && d.source_version < currentVersion
      )

      for (const dep of outdated) {
        await fetch(`/api/admin/workspaces/${dep.workspace_id}/deployed-team/upgrade`, {
          method: 'POST'
        })
      }

      await fetchDeployments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redeploy')
    } finally {
      setRedeployingAll(false)
    }
  }

  // Toggle workspace selection for deploy
  function toggleWorkspaceSelection(workspaceId: string) {
    setSelectedWorkspaceIds(prev => {
      const next = new Set(prev)
      if (next.has(workspaceId)) {
        next.delete(workspaceId)
      } else {
        next.add(workspaceId)
      }
      return next
    })
  }

  // Get workspaces that don't have this team deployed
  const deployedWorkspaceIds = new Set(
    deployments.filter(d => d.status === 'active').map(d => d.workspace_id)
  )
  const availableWorkspaces = allWorkspaces.filter(w => !deployedWorkspaceIds.has(w.id))

  // Filter mind files for assignment dialog (exclude already assigned)
  const assignedMindIds = new Set(teamMind.map(tm => tm.mind_id))
  const availableMind = allMind.filter(m =>
    !assignedMindIds.has(m.id) &&
    (!mindSearch || m.name.toLowerCase().includes(mindSearch.toLowerCase()))
  )

  // Get agents that are in the team (for delegation picker)
  const teamAgentsList = allAgents.filter(a => selectedAgentIds.has(a.id))

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Team not found</p>
        <Button variant="link" onClick={() => router.push('/admin/teams')}>
          Back to Teams
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/teams')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{team.name}</h1>
              {!team.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-muted-foreground">{team.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="h-4 w-4" />
          <span>{team.agent_count || 0} agents</span>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-1">
            <Bot className="h-4 w-4" />
            Agents
            <Badge variant="secondary" className="ml-1">{selectedAgentIds.size}</Badge>
          </TabsTrigger>
          <TabsTrigger value="delegations" className="flex items-center gap-1">
            <ArrowRight className="h-4 w-4" />
            Delegations
            <Badge variant="secondary" className="ml-1">{delegations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" />
            Plans
            <Badge variant="secondary" className="ml-1">{linkedPlans.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="mind" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Mind
            <Badge variant="secondary" className="ml-1">{teamMind.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="deployments" className="flex items-center gap-1">
            <Rocket className="h-4 w-4" />
            Deployments
            <Badge variant="secondary" className="ml-1">{activeDeployments}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Health Metrics Row */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* Agents Count */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Agents</p>
                    <p className="text-2xl font-bold">{selectedAgentIds.size}</p>
                  </div>
                  <div className={`p-2 rounded-full ${
                    selectedAgentIds.size >= 2 ? 'bg-green-100 text-green-600' :
                    selectedAgentIds.size === 1 ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Head Agent */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Head Agent</p>
                    <p className="text-2xl font-bold">{headAgentId ? 'Yes' : 'No'}</p>
                  </div>
                  <div className={`p-2 rounded-full ${
                    headAgentId ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {headAgentId ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delegations Count */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delegations</p>
                    <p className="text-2xl font-bold">{delegations.length}</p>
                  </div>
                  <div className={`p-2 rounded-full ${
                    selectedAgentIds.size <= 1 ? 'bg-gray-100 text-gray-600' :
                    delegations.length >= selectedAgentIds.size - 1 ? 'bg-green-100 text-green-600' :
                    delegations.length > 0 ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration Status */}
            <Card>
              <CardContent className="pt-6">
                {(() => {
                  const agentsWithDesc = teamAgentsList.filter(a => a.description).length
                  const totalAgents = teamAgentsList.length
                  const pct = totalAgents > 0 ? Math.round((agentsWithDesc / totalAgents) * 100) : 0
                  return (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Configuration</p>
                        <p className="text-2xl font-bold">{pct}%</p>
                      </div>
                      <div className={`p-2 rounded-full ${
                        pct >= 80 ? 'bg-green-100 text-green-600' :
                        pct >= 50 ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {pct >= 80 ? <CheckCircle className="h-5 w-5" /> :
                         pct >= 50 ? <AlertTriangle className="h-5 w-5" /> :
                         <AlertCircle className="h-5 w-5" />}
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Team Org Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Structure</CardTitle>
              <CardDescription>
                Visual hierarchy with delegation flows between agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamOrgChart
                agents={teamAgentsList.map(agent => ({
                  id: agent.id,
                  name: agent.name,
                  avatarUrl: agent.avatar_url,
                  model: agent.model,
                  isEnabled: agent.is_enabled,
                }))}
                delegations={delegations.map(d => ({
                  from_agent_id: d.from_agent_id,
                  to_agent_id: d.to_agent_id,
                  condition: d.condition,
                }))}
                headAgentId={headAgentId || null}
                onAgentClick={(agentId) => router.push(`/admin/agents/${agentId}`)}
                onAddAgents={() => setActiveTab('agents')}
              />
            </CardContent>
          </Card>

          {/* Collapsible Settings */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">Team Settings</CardTitle>
                        <CardDescription>Configure the team name, description, and lead agent</CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-0">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug</Label>
                      <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Head Agent</Label>
                      <Select value={headAgentId || '_none'} onValueChange={(v) => setHeadAgentId(v === '_none' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select head agent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {teamAgentsList.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        The lead agent that coordinates this team
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center gap-2 pt-2">
                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                        <span className="text-sm">{isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveOverview} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Agents</CardTitle>
                  <CardDescription>Select which agents are part of this team ({selectedAgentIds.size} selected)</CardDescription>
                </div>
                <Button onClick={saveAgents} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Agents
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] border rounded-md">
                <div className="p-4 space-y-2">
                  {allAgents.map(agent => (
                    <div
                      key={agent.id}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedAgentIds.has(agent.id) ? 'bg-primary/5 border-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleAgent(agent.id)}
                    >
                      <Checkbox checked={selectedAgentIds.has(agent.id)} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{agent.name}</span>
                          <Badge variant="outline" className="text-xs">{agent.model}</Badge>
                          {headAgentId === agent.id && (
                            <Badge variant="default" className="text-xs">Head</Badge>
                          )}
                          {!agent.is_enabled && (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{agent.description || 'No description'}</p>
                      </div>
                      {selectedAgentIds.has(agent.id) && agent.id !== headAgentId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setHeadAgentId(agent.id)
                          }}
                        >
                          Make Head
                        </Button>
                      )}
                    </div>
                  ))}
                  {allAgents.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No agents available. Create agents in the Agents section first.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delegations Tab */}
        <TabsContent value="delegations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Delegations</CardTitle>
                  <CardDescription>Define how agents in this team delegate tasks to each other</CardDescription>
                </div>
                <Button onClick={saveDelegations} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Delegations
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Delegation Form */}
              <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                <h4 className="font-medium">Add Delegation</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>From Agent</Label>
                    <Select value={newFromAgentId} onValueChange={setNewFromAgentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamAgentsList.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To Agent</Label>
                    <Select value={newToAgentId} onValueChange={setNewToAgentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamAgentsList.filter(a => a.id !== newFromAgentId).map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Condition (when to delegate)</Label>
                  <Input
                    value={newCondition}
                    onChange={e => setNewCondition(e.target.value)}
                    placeholder="e.g., when user asks about finance"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Context Template (optional)</Label>
                  <Textarea
                    value={newContextTemplate}
                    onChange={e => setNewContextTemplate(e.target.value)}
                    placeholder="Context to pass to the delegated agent"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={addDelegation}
                  disabled={!newFromAgentId || !newToAgentId || newFromAgentId === newToAgentId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Delegation
                </Button>
              </div>

              {/* Delegations List */}
              {delegations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead></TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delegations.map((delegation, index) => (
                      <TableRow key={delegation.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-muted-foreground" />
                            <span>{delegation.from_agent?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-muted-foreground" />
                            <span>{delegation.to_agent?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {delegation.condition || 'Always'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDelegation(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowRight className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No delegations configured. Add delegations to define how agents hand off tasks.</p>
                </div>
              )}

              {teamAgentsList.length < 2 && (
                <div className="text-center py-4 text-sm text-muted-foreground bg-muted/50 rounded-md">
                  Add at least 2 agents to the team to configure delegations.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab (Read-only) */}
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Linked Plans</CardTitle>
              <CardDescription>Plans that use this team. Edit plans in the Plans section.</CardDescription>
            </CardHeader>
            <CardContent>
              {linkedPlans.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedPlans.map(plan => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{plan.slug}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/plans/${plan.id}`)}
                          >
                            <LinkIcon className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No plans use this team yet.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push('/admin/plans')}
                  >
                    Go to Plans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mind Tab */}
        <TabsContent value="mind">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Mind</CardTitle>
                  <CardDescription>
                    Mind files describe how this team coordinates and operates
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowMindDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Existing
                  </Button>
                  <Button onClick={() => setShowCreateMindDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teamMind.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {teamMind.map(tm => (
                    <Card
                      key={tm.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => tm.mind && setViewingMind(tm.mind)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {tm.mind?.name || 'Unknown'}
                          </CardTitle>
                          <Badge variant={tm.mind?.is_system ? 'default' : 'secondary'}>
                            {tm.mind?.is_system ? 'System' : 'Workspace'}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {tm.mind?.description || 'No description'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline">{tm.mind?.category}</Badge>
                          <Badge variant="secondary">{tm.mind?.content_type}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={tm.mind?.is_enabled ?? false}
                              onCheckedChange={() => tm.mind && toggleMindEnabled(tm.mind.id, tm.mind.is_enabled)}
                            />
                            <span className="text-sm text-muted-foreground">
                              {tm.mind?.is_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                tm.mind && setViewingMind(tm.mind)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeMindFromTeam(tm.mind_id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No mind files assigned to this team yet.</p>
                  <p className="text-sm mt-2">
                    Mind files describe how agents in this team coordinate and share knowledge.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deployments Tab */}
        <TabsContent value="deployments">
          <div className="space-y-6">
            {/* Deployment Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active</p>
                      <p className="text-2xl font-bold">{activeDeployments}</p>
                    </div>
                    <div className="p-2 rounded-full bg-green-100 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Outdated</p>
                      <p className="text-2xl font-bold">{outdatedDeployments}</p>
                    </div>
                    <div className={`p-2 rounded-full ${
                      outdatedDeployments > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Template Version</p>
                      <p className="text-2xl font-bold">v{currentVersion}</p>
                    </div>
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Deployed</p>
                      <p className="text-2xl font-bold">{deploymentsTotal}</p>
                    </div>
                    <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Deployments List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Workspace Deployments</CardTitle>
                    <CardDescription>Workspaces using this team template</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {outdatedDeployments > 0 && (
                      <Button
                        variant="outline"
                        onClick={redeployAll}
                        disabled={redeployingAll}
                      >
                        {redeployingAll ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4 mr-2" />
                        )}
                        Upgrade All ({outdatedDeployments})
                      </Button>
                    )}
                    <Button onClick={() => {
                      fetchWorkspaces()
                      setShowDeployDialog(true)
                    }}>
                      <Rocket className="h-4 w-4 mr-2" />
                      Deploy to Workspaces
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {deploymentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : deployments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deployed</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deployments.map(deployment => {
                        const isOutdated = deployment.status === 'active' && deployment.source_version < currentVersion
                        return (
                          <TableRow key={deployment.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {deployment.workspace?.name || 'Unknown'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>v{deployment.source_version}</span>
                                {isOutdated && (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                    Update Available (v{currentVersion})
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={deployment.status === 'active' ? 'default' : 'secondary'}
                                className={
                                  deployment.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                                  deployment.status === 'paused' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                                  ''
                                }
                              >
                                {deployment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {new Date(deployment.deployed_at).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {isOutdated && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      await fetch(`/api/admin/workspaces/${deployment.workspace_id}/deployed-team/upgrade`, {
                                        method: 'POST'
                                      })
                                      await fetchDeployments()
                                    }}
                                  >
                                    <ArrowUpCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/admin/workspaces/${deployment.workspace_id}`)}
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Rocket className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No deployments yet.</p>
                    <p className="text-sm mt-2">
                      Deploy this team to workspaces to enable multi-agent collaboration.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Deploy to Workspaces Dialog */}
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Deploy Team to Workspaces</DialogTitle>
            <DialogDescription>
              Select workspaces to deploy this team configuration to. Each workspace will get a copy of the team config.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-4 space-y-2">
                {availableWorkspaces.map(workspace => (
                  <div
                    key={workspace.id}
                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedWorkspaceIds.has(workspace.id) ? 'bg-primary/5 border-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleWorkspaceSelection(workspace.id)}
                  >
                    <Checkbox checked={selectedWorkspaceIds.has(workspace.id)} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{workspace.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {availableWorkspaces.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    All workspaces already have this team deployed.
                  </p>
                )}
              </div>
            </ScrollArea>
            <p className="text-sm text-muted-foreground">
              {selectedWorkspaceIds.size} workspace(s) selected
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeployDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={deployToWorkspaces}
              disabled={deploying || selectedWorkspaceIds.size === 0}
            >
              {deploying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              Deploy ({selectedWorkspaceIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Mind Dialog */}
      <Dialog open={showMindDialog} onOpenChange={setShowMindDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Assign Mind File</DialogTitle>
            <DialogDescription>
              Select an existing mind file from the library to assign to this team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search mind files..."
                value={mindSearch}
                onChange={e => setMindSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-4 space-y-2">
                {availableMind.map(mind => (
                  <div
                    key={mind.id}
                    className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => assignMindToTeam(mind.id)}
                  >
                    <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{mind.name}</span>
                        <Badge variant="outline" className="text-xs">{mind.category}</Badge>
                        {!mind.is_enabled && (
                          <Badge variant="secondary" className="text-xs">Disabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {mind.description || 'No description'}
                      </p>
                    </div>
                  </div>
                ))}
                {availableMind.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {mindSearch ? 'No matching mind files found' : 'All mind files are already assigned'}
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMindDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Mind Dialog */}
      <Dialog open={showCreateMindDialog} onOpenChange={setShowCreateMindDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Mind File</DialogTitle>
            <DialogDescription>
              Create a new mind file for this team. It will be automatically assigned.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={mindForm.name}
                onChange={e => setMindForm({ ...mindForm, name: e.target.value })}
                placeholder="e.g., Team Coordination Guidelines"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={mindForm.description}
                onChange={e => setMindForm({ ...mindForm, description: e.target.value })}
                placeholder="Brief description of this mind file"
              />
            </div>
            <div className="grid gap-2">
              <Label>Content</Label>
              <Textarea
                value={mindForm.content}
                onChange={e => setMindForm({ ...mindForm, content: e.target.value })}
                rows={6}
                placeholder="The mind content that guides the team..."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={mindForm.category}
                  onValueChange={v => setMindForm({ ...mindForm, category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['finance', 'crm', 'team', 'projects', 'knowledge', 'communications', 'goals', 'shared'].map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Content Type</Label>
                <Select
                  value={mindForm.content_type}
                  onValueChange={v => setMindForm({ ...mindForm, content_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['responsibilities', 'workflows', 'policies', 'metrics', 'examples', 'general'].map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={mindForm.is_enabled}
                onCheckedChange={v => setMindForm({ ...mindForm, is_enabled: v })}
              />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateMindDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={createMindForTeam}
              disabled={saving || !mindForm.name || !mindForm.content}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Mind Dialog */}
      <Dialog open={!!viewingMind} onOpenChange={(open) => !open && setViewingMind(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{viewingMind?.name}</DialogTitle>
              <Badge variant={viewingMind?.is_system ? 'default' : 'secondary'}>
                {viewingMind?.is_system ? 'System' : 'Workspace'}
              </Badge>
            </div>
            <DialogDescription>
              {viewingMind?.description || 'No description'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{viewingMind?.category}</Badge>
              <Badge variant="secondary">{viewingMind?.content_type}</Badge>
              {viewingMind?.scope && (
                <Badge variant="outline">Scope: {viewingMind.scope}</Badge>
              )}
            </div>
            <ScrollArea className="h-[400px] border rounded-md p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {viewingMind?.content}
              </pre>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingMind(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

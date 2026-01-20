'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ArrowLeft,
  Building2,
  Users,
  Settings,
  Activity,
  UserX,
  Key,
  Ban,
  CheckCircle,
  AlertTriangle,
  Crown,
  Shield,
  User,
  Brain,
  Copy,
  Rocket,
  ArrowUpCircle,
  RefreshCw,
  Bot,
  ArrowRight,
  Loader2,
  Link as LinkIcon,
  MessageSquare,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { WorkspaceDeployedTeamWithRelations, DeployedTeamConfig, Customizations } from '@/types/teams'

interface Profile {
  id: string
  email: string
  name: string | null
  avatar_url?: string | null
}

interface Workspace {
  id: string
  name: string
  slug: string
  description?: string | null
  avatar_url?: string | null
  is_suspended?: boolean
  suspended_at?: string | null
  suspended_reason?: string | null
  created_at: string
  owner: Profile
  workspace_members: {
    profile: Profile
    role: string
    joined_at: string
  }[]
}

interface Member {
  id: string
  role: string
  display_name?: string | null
  status?: string
  allowed_products?: string[]
  joined_at: string
  profile: Profile
}

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  expires_at: string | null
  is_revoked: boolean
  revoked_at: string | null
  created_at: string
  created_by: Profile | null
  revoked_by: Profile | null
}

interface FeatureFlag {
  feature_key: string
  is_enabled: boolean
  id: string | null
  updated_at: string | null
}

interface AuditLog {
  id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
  user: Profile | null
}

interface WorkspaceMind {
  id: string
  name: string
  description: string | null
  category: string
  content_type: string
  is_enabled: boolean
  is_system: boolean
  workspace_id: string | null
  created_at: string
}

export default function WorkspaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [mind, setMind] = useState<WorkspaceMind[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Deployed team state
  const [deployedTeam, setDeployedTeam] = useState<WorkspaceDeployedTeamWithRelations | null>(null)
  const [deployedTeamLoading, setDeployedTeamLoading] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [latestVersion, setLatestVersion] = useState(1)
  const [upgrading, setUpgrading] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Dialog states
  const [suspendDialog, setSuspendDialog] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [memberDialog, setMemberDialog] = useState<{
    open: boolean
    type: 'remove' | 'role' | null
    member: Member | null
    newRole?: string
  }>({ open: false, type: null, member: null })
  const [revokeKeyDialog, setRevokeKeyDialog] = useState<{ open: boolean; key: ApiKey | null }>({
    open: false,
    key: null
  })
  const [actionLoading, setActionLoading] = useState(false)

  const fetchWorkspace = useCallback(async () => {
    const res = await fetch(`/api/admin/workspaces/${workspaceId}`)
    if (res.ok) {
      const data = await res.json()
      setWorkspace(data.workspace)
    }
  }, [workspaceId])

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/admin/workspaces/${workspaceId}/members`)
    if (res.ok) {
      const data = await res.json()
      setMembers(data.members || [])
    }
  }, [workspaceId])

  const fetchApiKeys = useCallback(async () => {
    const res = await fetch(`/api/admin/workspaces/${workspaceId}/api-keys`)
    if (res.ok) {
      const data = await res.json()
      setApiKeys(data.api_keys || [])
    }
  }, [workspaceId])

  const fetchFeatureFlags = useCallback(async () => {
    const res = await fetch(`/api/admin/workspaces/${workspaceId}/feature-flags`)
    if (res.ok) {
      const data = await res.json()
      setFeatureFlags(data.feature_flags || [])
    }
  }, [workspaceId])

  const fetchAuditLogs = useCallback(async () => {
    const res = await fetch(`/api/admin/workspaces/${workspaceId}/audit-logs`)
    if (res.ok) {
      const data = await res.json()
      setAuditLogs(data.audit_logs || [])
    }
  }, [workspaceId])

  const fetchMind = useCallback(async () => {
    const res = await fetch(`/api/admin/mind?workspace_id=${workspaceId}&include_workspace=true`)
    if (res.ok) {
      const data = await res.json()
      setMind(data.mind || [])
    }
  }, [workspaceId])

  const fetchDeployedTeam = useCallback(async () => {
    setDeployedTeamLoading(true)
    try {
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/deployed-team`)
      if (res.ok) {
        const data = await res.json()
        setDeployedTeam(data.deployment || null)
        setUpdateAvailable(data.update_available || false)
        setLatestVersion(data.latest_version || 1)
      }
    } finally {
      setDeployedTeamLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      await Promise.all([
        fetchWorkspace(),
        fetchMembers(),
        fetchApiKeys(),
        fetchFeatureFlags(),
        fetchAuditLogs(),
        fetchMind()
      ])
      setLoading(false)
    }
    loadData()
  }, [fetchWorkspace, fetchMembers, fetchApiKeys, fetchFeatureFlags, fetchAuditLogs, fetchMind])

  // Fetch deployed team when switching to team tab
  useEffect(() => {
    if (activeTab === 'team' && !deployedTeam && !deployedTeamLoading) {
      fetchDeployedTeam()
    }
  }, [activeTab, deployedTeam, deployedTeamLoading, fetchDeployedTeam])

  async function handleSuspend() {
    setActionLoading(true)
    const res = await fetch(`/api/admin/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_suspended: !workspace?.is_suspended,
        suspended_reason: workspace?.is_suspended ? null : suspendReason
      })
    })
    if (res.ok) {
      fetchWorkspace()
      setSuspendDialog(false)
      setSuspendReason('')
    }
    setActionLoading(false)
  }

  async function handleRemoveMember() {
    if (!memberDialog.member) return
    setActionLoading(true)
    const res = await fetch(
      `/api/admin/workspaces/${workspaceId}/members/${memberDialog.member.id}`,
      { method: 'DELETE' }
    )
    if (res.ok) {
      fetchMembers()
      fetchWorkspace()
    }
    setActionLoading(false)
    setMemberDialog({ open: false, type: null, member: null })
  }

  async function handleChangeRole() {
    if (!memberDialog.member || !memberDialog.newRole) return
    setActionLoading(true)
    const res = await fetch(
      `/api/admin/workspaces/${workspaceId}/members/${memberDialog.member.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: memberDialog.newRole })
      }
    )
    if (res.ok) {
      fetchMembers()
    }
    setActionLoading(false)
    setMemberDialog({ open: false, type: null, member: null })
  }

  async function handleRevokeKey() {
    if (!revokeKeyDialog.key) return
    setActionLoading(true)
    const res = await fetch(
      `/api/admin/workspaces/${workspaceId}/api-keys/${revokeKeyDialog.key.id}`,
      { method: 'DELETE' }
    )
    if (res.ok) {
      fetchApiKeys()
    }
    setActionLoading(false)
    setRevokeKeyDialog({ open: false, key: null })
  }

  async function handleToggleFeatureFlag(featureKey: string, currentValue: boolean) {
    const res = await fetch(`/api/admin/workspaces/${workspaceId}/feature-flags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_key: featureKey, is_enabled: !currentValue })
    })
    if (res.ok) {
      fetchFeatureFlags()
    }
  }

  async function handleUpgradeDeployment() {
    setUpgrading(true)
    try {
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/deployed-team/upgrade`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchDeployedTeam()
      }
    } finally {
      setUpgrading(false)
    }
  }

  async function handleResetCustomizations() {
    setResetting(true)
    try {
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/deployed-team/reset`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchDeployedTeam()
      }
    } finally {
      setResetting(false)
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case 'owner': return <Crown className="h-3 w-3" />
      case 'admin': return <Shield className="h-3 w-3" />
      default: return <User className="h-3 w-3" />
    }
  }

  function getRoleBadgeVariant(role: string) {
    switch (role) {
      case 'owner': return 'default'
      case 'admin': return 'secondary'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Workspace not found</p>
        <Button asChild className="mt-4">
          <Link href="/admin/workspaces">Back to Workspaces</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/workspaces')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-12 w-12">
            <AvatarImage src={workspace.avatar_url || undefined} />
            <AvatarFallback>
              <Building2 className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{workspace.name}</h1>
              {workspace.is_suspended && (
                <Badge variant="destructive">Suspended</Badge>
              )}
            </div>
            <p className="text-muted-foreground">/{workspace.slug}</p>
          </div>
        </div>
        <Button
          variant={workspace.is_suspended ? 'default' : 'destructive'}
          onClick={() => setSuspendDialog(true)}
        >
          {workspace.is_suspended ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Unsuspend
            </>
          ) : (
            <>
              <Ban className="mr-2 h-4 w-4" />
              Suspend
            </>
          )}
        </Button>
      </div>

      {/* Suspension Warning */}
      {workspace.is_suspended && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">This workspace is suspended</p>
              {workspace.suspended_reason && (
                <p className="text-sm text-muted-foreground">
                  Reason: {workspace.suspended_reason}
                </p>
              )}
              {workspace.suspended_at && (
                <p className="text-sm text-muted-foreground">
                  Suspended {formatDistanceToNow(new Date(workspace.suspended_at), { addSuffix: true })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Building2 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="mind" className="gap-2">
            <Brain className="h-4 w-4" />
            Mind ({mind.filter(m => m.workspace_id === workspaceId).length})
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Rocket className="h-4 w-4" />
            Team
            {deployedTeam && <Badge variant="secondary" className="ml-1">Active</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{workspace.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Slug</Label>
                  <p className="font-medium">/{workspace.slug}</p>
                </div>
                {workspace.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="font-medium">{workspace.description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">
                    {format(new Date(workspace.created_at), 'PPP')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(workspace.owner.name, workspace.owner.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{workspace.owner.name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{workspace.owner.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                All users with access to this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(member => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.profile.avatar_url || undefined} />
                            <AvatarFallback>
                              {getInitials(member.profile.name, member.profile.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.profile.name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{member.profile.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role) as 'default' | 'secondary' | 'outline'} className="gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {member.role !== 'owner' && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMemberDialog({
                                open: true,
                                type: 'role',
                                member,
                                newRole: member.role === 'admin' ? 'member' : 'admin'
                              })}
                            >
                              Change role
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setMemberDialog({
                                open: true,
                                type: 'remove',
                                member
                              })}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {/* Feature Flags */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Toggle features for this workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {featureFlags.map(flag => (
                <div key={flag.feature_key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{flag.feature_key.replace(/_/g, ' ')}</p>
                    {flag.updated_at && (
                      <p className="text-sm text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(flag.updated_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={flag.is_enabled}
                    onCheckedChange={() => handleToggleFeatureFlag(flag.feature_key, flag.is_enabled)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                API keys for programmatic access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No API keys</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map(key => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell className="font-mono text-sm">{key.key_prefix}...</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          {key.is_revoked ? (
                            <Badge variant="destructive">Revoked</Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!key.is_revoked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setRevokeKeyDialog({ open: true, key })}
                            >
                              <Key className="h-4 w-4" />
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Recent activity in this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No activity recorded</p>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {log.user ? getInitials(log.user.name, log.user.email) : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p>
                          <span className="font-medium">
                            {log.user?.name || log.user?.email || 'Unknown'}
                          </span>
                          {' '}
                          <span className="text-muted-foreground">{log.action.replace(/_/g, ' ')}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mind Tab */}
        <TabsContent value="mind" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Workspace Mind Files
              </CardTitle>
              <CardDescription>
                Custom mind files created for this workspace (excludes system templates)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mind.filter(m => m.workspace_id === workspaceId).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No custom mind files created for this workspace yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mind
                      .filter(m => m.workspace_id === workspaceId)
                      .map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.content_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.is_enabled ? 'default' : 'secondary'}>
                              {item.is_enabled ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Available System Mind Templates
              </CardTitle>
              <CardDescription>
                System mind templates that can be copied to this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mind.filter(m => m.is_system).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No system mind templates available.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {mind.filter(m => m.is_system).map(item => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{item.name}</p>
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs shrink-0">
                              System
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            <Badge variant="secondary" className="text-xs">{item.content_type}</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          {deployedTeamLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : deployedTeam ? (
            <>
              {/* Deployment Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Rocket className="h-5 w-5" />
                        Deployed Team: {(deployedTeam.source_team as { name: string } | undefined)?.name || 'Unknown'}
                      </CardTitle>
                      <CardDescription>
                        Deployed on {format(new Date(deployedTeam.deployed_at), 'PPP')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {updateAvailable && (
                        <Button
                          variant="outline"
                          onClick={handleUpgradeDeployment}
                          disabled={upgrading}
                        >
                          {upgrading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 mr-2" />
                          )}
                          Upgrade to v{latestVersion}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={handleResetCustomizations}
                        disabled={resetting}
                      >
                        {resetting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Reset Customizations
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => router.push(`/admin/teams/${deployedTeam.source_team_id}`)}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        View Template
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => router.push(`/admin/workspaces/${workspaceId}/team-chat`)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Team Chat
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <Label className="text-muted-foreground">Version</Label>
                      <p className="font-medium">
                        v{deployedTeam.source_version}
                        {updateAvailable && (
                          <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-600">
                            Update Available
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <p>
                        <Badge
                          variant={deployedTeam.status === 'active' ? 'default' : 'secondary'}
                          className={deployedTeam.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {deployedTeam.status}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Agents</Label>
                      <p className="font-medium">
                        {(deployedTeam.active_config as DeployedTeamConfig)?.agents?.filter(a => a.is_enabled).length || 0} active
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Delegations</Label>
                      <p className="font-medium">
                        {(deployedTeam.active_config as DeployedTeamConfig)?.delegations?.filter(d => d.is_enabled).length || 0} active
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agents List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Team Agents
                  </CardTitle>
                  <CardDescription>
                    Agents deployed to this workspace
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Tools</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((deployedTeam.active_config as DeployedTeamConfig)?.agents || []).map(agent => (
                        <TableRow key={agent.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{agent.name}</p>
                                <p className="text-sm text-muted-foreground">{agent.slug}</p>
                              </div>
                              {(deployedTeam.active_config as DeployedTeamConfig)?.team?.head_agent_id === agent.id && (
                                <Badge>Head</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{agent.model}</Badge>
                          </TableCell>
                          <TableCell>
                            {agent.tools?.length || 0} tools
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={agent.is_enabled ? 'default' : 'secondary'}
                              className={agent.is_enabled ? 'bg-green-100 text-green-800' : ''}
                            >
                              {agent.is_enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Delegations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5" />
                    Delegation Rules
                  </CardTitle>
                  <CardDescription>
                    How agents delegate tasks to each other
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {((deployedTeam.active_config as DeployedTeamConfig)?.delegations || []).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>From</TableHead>
                          <TableHead></TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {((deployedTeam.active_config as DeployedTeamConfig)?.delegations || []).map(delegation => (
                          <TableRow key={delegation.id}>
                            <TableCell className="font-medium">{delegation.from_agent_slug}</TableCell>
                            <TableCell>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="font-medium">{delegation.to_agent_slug}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {delegation.condition || 'Always'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={delegation.is_enabled ? 'default' : 'secondary'}
                                className={delegation.is_enabled ? 'bg-green-100 text-green-800' : ''}
                              >
                                {delegation.is_enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No delegation rules configured
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Customizations Summary */}
              {deployedTeam.customizations && (
                <Card>
                  <CardHeader>
                    <CardTitle>Customizations</CardTitle>
                    <CardDescription>
                      Workspace-specific modifications to the team template
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const customizations = deployedTeam.customizations as Customizations
                      const hasCustomizations =
                        (customizations.disabled_agents?.length || 0) > 0 ||
                        (customizations.disabled_delegations?.length || 0) > 0 ||
                        (customizations.added_mind?.length || 0) > 0 ||
                        Object.keys(customizations.agent_overrides || {}).length > 0

                      if (!hasCustomizations) {
                        return (
                          <p className="text-muted-foreground text-center py-4">
                            No customizations applied. Using default team configuration.
                          </p>
                        )
                      }

                      return (
                        <div className="space-y-4">
                          {(customizations.disabled_agents?.length || 0) > 0 && (
                            <div>
                              <Label className="text-muted-foreground">Disabled Agents</Label>
                              <div className="flex gap-2 mt-1">
                                {customizations.disabled_agents?.map(slug => (
                                  <Badge key={slug} variant="secondary">{slug}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {(customizations.disabled_delegations?.length || 0) > 0 && (
                            <div>
                              <Label className="text-muted-foreground">Disabled Delegations</Label>
                              <p className="font-medium">{customizations.disabled_delegations?.length} disabled</p>
                            </div>
                          )}
                          {(customizations.added_mind?.length || 0) > 0 && (
                            <div>
                              <Label className="text-muted-foreground">Added Mind Files</Label>
                              <p className="font-medium">{customizations.added_mind?.length} custom mind files</p>
                            </div>
                          )}
                          {Object.keys(customizations.agent_overrides || {}).length > 0 && (
                            <div>
                              <Label className="text-muted-foreground">Agent Overrides</Label>
                              <p className="font-medium">
                                {Object.keys(customizations.agent_overrides || {}).length} agents modified
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Rocket className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No team deployed to this workspace</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Deploy a team from the Teams section to enable multi-agent collaboration.
                </p>
                <Button className="mt-4" onClick={() => router.push('/admin/teams')}>
                  Go to Teams
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog} onOpenChange={setSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {workspace.is_suspended ? 'Unsuspend Workspace' : 'Suspend Workspace'}
            </DialogTitle>
            <DialogDescription>
              {workspace.is_suspended
                ? 'This will restore access to the workspace for all members.'
                : 'This will prevent all members from accessing the workspace.'}
            </DialogDescription>
          </DialogHeader>
          {!workspace.is_suspended && (
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Reason (optional)</Label>
              <Input
                id="suspend-reason"
                placeholder="e.g., Policy violation, Non-payment"
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={workspace.is_suspended ? 'default' : 'destructive'}
              onClick={handleSuspend}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : workspace.is_suspended ? 'Unsuspend' : 'Suspend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Action Dialog */}
      <Dialog
        open={memberDialog.open}
        onOpenChange={open => !open && setMemberDialog({ open: false, type: null, member: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {memberDialog.type === 'remove' ? 'Remove Member' : 'Change Role'}
            </DialogTitle>
            <DialogDescription>
              {memberDialog.type === 'remove'
                ? `Are you sure you want to remove ${memberDialog.member?.profile.email} from this workspace?`
                : `Change ${memberDialog.member?.profile.email}'s role?`}
            </DialogDescription>
          </DialogHeader>
          {memberDialog.type === 'role' && (
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select
                value={memberDialog.newRole}
                onValueChange={value => setMemberDialog(prev => ({ ...prev, newRole: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemberDialog({ open: false, type: null, member: null })}
            >
              Cancel
            </Button>
            <Button
              variant={memberDialog.type === 'remove' ? 'destructive' : 'default'}
              onClick={memberDialog.type === 'remove' ? handleRemoveMember : handleChangeRole}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : memberDialog.type === 'remove' ? 'Remove' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Key Dialog */}
      <Dialog
        open={revokeKeyDialog.open}
        onOpenChange={open => !open && setRevokeKeyDialog({ open: false, key: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the API key &quot;{revokeKeyDialog.key?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeKeyDialog({ open: false, key: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevokeKey} disabled={actionLoading}>
              {actionLoading ? 'Revoking...' : 'Revoke Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

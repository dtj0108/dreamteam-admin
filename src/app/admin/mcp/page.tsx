'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Plug, Trash2, ExternalLink, Terminal, Radio, Globe } from 'lucide-react'

interface MCPIntegration {
  id: string
  name: string
  description: string | null
  type: 'stdio' | 'sse' | 'http'
  config: Record<string, unknown>
  auth_type: string
  is_enabled: boolean
  created_at: string
}

const typeIcons = {
  stdio: Terminal,
  sse: Radio,
  http: Globe
}

const typeLabels = {
  stdio: 'Standard I/O',
  sse: 'Server-Sent Events',
  http: 'HTTP/REST'
}

export default function MCPIntegrationsPage() {
  const [integrations, setIntegrations] = useState<MCPIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialog, setCreateDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; integration: MCPIntegration | null }>({
    open: false,
    integration: null
  })
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'http' as 'stdio' | 'sse' | 'http',
    config: '{}',
    auth_type: 'none'
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchIntegrations = useCallback(async () => {
    const res = await fetch('/api/admin/mcp-integrations')
    if (res.ok) {
      const data = await res.json()
      setIntegrations(data.integrations || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setActionLoading(true)
    setFormError('')

    let configJson = {}
    try {
      configJson = JSON.parse(formData.config || '{}')
    } catch {
      setFormError('Invalid JSON in config')
      setActionLoading(false)
      return
    }

    const res = await fetch('/api/admin/mcp-integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        config: configJson,
        auth_type: formData.auth_type
      })
    })

    if (res.ok) {
      fetchIntegrations()
      setCreateDialog(false)
      setFormData({ name: '', description: '', type: 'http', config: '{}', auth_type: 'none' })
    } else {
      const data = await res.json()
      setFormError(data.error || 'Failed to create integration')
    }
    setActionLoading(false)
  }

  async function handleDelete() {
    if (!deleteDialog.integration) return
    setActionLoading(true)

    const res = await fetch(`/api/admin/mcp-integrations/${deleteDialog.integration.id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      fetchIntegrations()
    }
    setActionLoading(false)
    setDeleteDialog({ open: false, integration: null })
  }

  async function handleToggleEnabled(integration: MCPIntegration) {
    const res = await fetch(`/api/admin/mcp-integrations/${integration.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !integration.is_enabled })
    })

    if (res.ok) {
      fetchIntegrations()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP Integrations</h1>
          <p className="text-muted-foreground">Connect external tools and services to agents</p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Integration
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-800">Enabled</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter(i => i.is_enabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-sm">
              <span>HTTP: {integrations.filter(i => i.type === 'http').length}</span>
              <span>SSE: {integrations.filter(i => i.type === 'sse').length}</span>
              <span>StdIO: {integrations.filter(i => i.type === 'stdio').length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Auth</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : integrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No integrations yet. Add your first MCP integration.
                </TableCell>
              </TableRow>
            ) : (
              integrations.map((integration) => {
                const TypeIcon = typeIcons[integration.type]
                return (
                  <TableRow key={integration.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        {integration.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {integration.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {typeLabels[integration.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{integration.auth_type}</TableCell>
                    <TableCell>
                      <Switch
                        checked={integration.is_enabled}
                        onCheckedChange={() => handleToggleEnabled(integration)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(integration.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/mcp/${integration.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteDialog({ open: true, integration })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add MCP Integration</DialogTitle>
            <DialogDescription>
              Connect an external tool or service via MCP protocol.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Slack, GitHub, Custom API"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What does this integration do?"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={value => setFormData(prev => ({ ...prev, type: value as 'stdio' | 'sse' | 'http' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP/REST</SelectItem>
                    <SelectItem value="sse">Server-Sent Events</SelectItem>
                    <SelectItem value="stdio">Standard I/O</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Authentication</Label>
                <Select
                  value={formData.auth_type}
                  onValueChange={value => setFormData(prev => ({ ...prev, auth_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="config">Configuration (JSON)</Label>
              <Textarea
                id="config"
                placeholder='{"url": "https://api.example.com", "timeout": 30000}'
                value={formData.config}
                onChange={e => setFormData(prev => ({ ...prev, config: e.target.value }))}
                className="font-mono text-sm"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading || !formData.name}>
                {actionLoading ? 'Creating...' : 'Create Integration'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={open => !open && setDeleteDialog({ open: false, integration: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Integration</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.integration?.name}&quot;?
              This will remove it from all agents using it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, integration: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

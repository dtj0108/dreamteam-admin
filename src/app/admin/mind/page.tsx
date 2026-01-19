'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Plus,
  Search,
  Save,
  Trash2,
} from 'lucide-react'

type MindScope = 'agent' | 'department' | 'company'

interface MindFile {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  content: string
  content_type: string
  position: number
  is_enabled: boolean
  is_system: boolean
  workspace_id: string | null
  scope: MindScope
  department_id: string | null
  created_at: string
}

const MIND_CATEGORIES = [
  'finance', 'crm', 'team', 'projects', 'knowledge', 'communications', 'goals', 'shared'
] as const

const MIND_CONTENT_TYPES = [
  'responsibilities', 'workflows', 'policies', 'metrics', 'examples', 'general'
] as const

const MIND_SCOPES: MindScope[] = ['agent', 'department', 'company']

export default function AdminMindPage() {
  const [mind, setMind] = useState<MindFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingMind, setEditingMind] = useState<MindFile | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'knowledge',
    content: '',
    content_type: 'general',
    position: 0,
    is_enabled: true,
    is_system: true,
    workspace_id: '',
    scope: 'agent' as MindScope,
    department_id: ''
  })

  const fetchMind = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('include_workspace', 'true')
    const res = await fetch(`/api/admin/mind?${params}`)
    if (res.ok) {
      const data = await res.json()
      setMind(data.mind || [])
    }
    setLoading(false)
  }, [search])

  useEffect(() => {
    fetchMind()
  }, [fetchMind])

  function resetForm() {
    setForm({
      name: '',
      slug: '',
      description: '',
      category: 'knowledge',
      content: '',
      content_type: 'general',
      position: 0,
      is_enabled: true,
      is_system: true,
      workspace_id: '',
      scope: 'agent',
      department_id: ''
    })
  }

  function openCreate() {
    setEditingMind(null)
    resetForm()
    setShowCreate(true)
  }

  function openEdit(item: MindFile) {
    setEditingMind(item)
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      category: item.category,
      content: item.content,
      content_type: item.content_type,
      position: item.position || 0,
      is_enabled: item.is_enabled,
      is_system: item.is_system,
      workspace_id: item.workspace_id || '',
      scope: item.scope,
      department_id: item.department_id || ''
    })
    setShowCreate(true)
  }

  async function saveMind() {
    setSaving(true)
    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || null,
      category: form.category,
      content: form.content,
      content_type: form.content_type,
      position: form.position,
      is_enabled: form.is_enabled,
      is_system: form.is_system,
      workspace_id: form.workspace_id || null,
      scope: form.scope,
      department_id: form.department_id || null
    }

    const res = await fetch(
      editingMind ? `/api/admin/mind/${editingMind.id}` : '/api/admin/mind',
      {
        method: editingMind ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    )

    if (res.ok) {
      setShowCreate(false)
      setEditingMind(null)
      resetForm()
      fetchMind()
    }
    setSaving(false)
  }

  async function deleteMind(item: MindFile) {
    const res = await fetch(`/api/admin/mind/${item.id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchMind()
    }
  }

  async function saveMindToggle(item: MindFile) {
    const res = await fetch(`/api/admin/mind/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !item.is_enabled })
    })
    if (res.ok) {
      fetchMind()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mind Library</h1>
          <p className="text-sm text-muted-foreground">Manage system and workspace mind files.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Mind File
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative w-full max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search mind files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchMind}>Refresh</Button>
      </div>

      {loading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mind.map(item => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {item.name}
                  </CardTitle>
                  <Badge variant={item.is_system ? 'default' : 'secondary'}>
                    {item.is_system ? 'System' : 'Workspace'}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {item.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge variant="secondary">{item.content_type}</Badge>
                  <Badge variant="outline">{item.scope}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_enabled}
                      onCheckedChange={() => saveMindToggle(item)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMind(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMind ? 'Edit Mind File' : 'Create Mind File'}</DialogTitle>
            <DialogDescription>Define the mind content and scope.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Content</Label>
              <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={6} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MIND_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Content Type</Label>
                <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MIND_CONTENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Scope</Label>
                <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as MindScope })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MIND_SCOPES.map(scope => (
                      <SelectItem key={scope} value={scope}>{scope}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Workspace ID</Label>
                <Input value={form.workspace_id} onChange={e => setForm({ ...form, workspace_id: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Department ID</Label>
                <Input value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_system}
                  onCheckedChange={(v) => setForm({ ...form, is_system: v })}
                />
                <Label>System Template</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_enabled}
                  onCheckedChange={(v) => setForm({ ...form, is_enabled: v })}
                />
                <Label>Enabled</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={saveMind} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


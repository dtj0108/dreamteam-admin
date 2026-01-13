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
  ArrowLeft,
  Save,
  FileText,
  LayoutTemplate,
  AlertTriangle,
  Zap,
  Sparkles,
  History,
  Trash2,
  Plus,
  RotateCcw
} from 'lucide-react'
import type { AgentSkill, SkillVersion, SkillLearnedRule, SkillTemplate, SkillEdgeCase } from '@/types/skills'

const categories = [
  { value: 'sales', label: 'Sales' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'communication', label: 'Communication' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'operations', label: 'Operations' },
  { value: 'general', label: 'General' },
]

export default function SkillEditorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [skill, setSkill] = useState<AgentSkill | null>(null)
  const [versions, setVersions] = useState<SkillVersion[]>([])
  const [learnedRules, setLearnedRules] = useState<SkillLearnedRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [skillContent, setSkillContent] = useState('')
  const [triggers, setTriggers] = useState<string[]>([])
  const [newTrigger, setNewTrigger] = useState('')

  const fetchSkill = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/skills/${id}`)
      if (!res.ok) {
        throw new Error('Skill not found')
      }
      const data = await res.json()
      setSkill(data.skill)
      setVersions(data.versions || [])
      setLearnedRules(data.learnedRules || [])

      // Set form values
      setName(data.skill.name)
      setDescription(data.skill.description || '')
      setCategory(data.skill.category || 'general')
      setSkillContent(data.skill.skill_content)
      setTriggers(
        (data.skill.triggers || []).map((t: { phrase: string } | string) =>
          typeof t === 'string' ? t : t.phrase
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skill')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSkill()
  }, [fetchSkill])

  async function handleSave() {
    if (!skill) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/skills/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          category,
          skill_content: skillContent,
          triggers: triggers.map(phrase => ({ phrase, matchType: 'contains', priority: 1 }))
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      await fetchSkill()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleEnabled() {
    if (!skill) return

    const res = await fetch(`/api/admin/skills/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !skill.is_enabled })
    })

    if (res.ok) {
      fetchSkill()
    }
  }

  async function handleRollback(version: number) {
    if (!confirm(`Rollback to version ${version}? This will create a new version.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/skills/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      })

      if (!res.ok) {
        throw new Error('Failed to rollback')
      }

      await fetchSkill()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback')
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!confirm('Delete this learned rule?')) return

    try {
      const res = await fetch(`/api/admin/rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to delete rule')
      }

      await fetchSkill()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    }
  }

  async function handlePromoteRule(ruleId: string) {
    if (!confirm('Promote this rule to global scope? It will apply to all workspaces.')) return

    try {
      const res = await fetch(`/api/admin/rules/${ruleId}/promote`, {
        method: 'POST'
      })

      if (!res.ok) {
        throw new Error('Failed to promote rule')
      }

      await fetchSkill()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote rule')
    }
  }

  function addTrigger() {
    if (newTrigger.trim() && !triggers.includes(newTrigger.trim())) {
      setTriggers([...triggers, newTrigger.trim()])
      setNewTrigger('')
    }
  }

  function removeTrigger(trigger: string) {
    setTriggers(triggers.filter(t => t !== trigger))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Skill not found</p>
        <Button variant="link" onClick={() => router.push('/admin/skills')}>
          Back to Skills
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/skills')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{skill.name}</h1>
              {skill.is_system && (
                <Badge variant="outline">System</Badge>
              )}
              <Badge variant="secondary">v{skill.version}</Badge>
            </div>
            <p className="text-muted-foreground">
              {skill.description || 'No description'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="enabled">Enabled</Label>
            <Switch
              id="enabled"
              checked={skill.is_enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>
          <Button onClick={handleSave} disabled={saving || skill.is_system}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {skill.is_system && (
        <div className="bg-muted px-4 py-3 rounded-md text-sm">
          This is a system skill. Only enable/disable is allowed.
        </div>
      )}

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Templates
            {skill.templates?.length > 0 && (
              <Badge variant="secondary" className="ml-1">{skill.templates.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="edge-cases" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Edge Cases
            {skill.edge_cases?.length > 0 && (
              <Badge variant="secondary" className="ml-1">{skill.edge_cases.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Triggers
            {triggers.length > 0 && (
              <Badge variant="secondary" className="ml-1">{triggers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="learned-rules" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Learned Rules
            {learnedRules.length > 0 && (
              <Badge variant="secondary" className="ml-1">{learnedRules.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={skill.is_system}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    disabled={skill.is_system}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory} disabled={skill.is_system}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
                <CardDescription>
                  Markdown content that teaches agents how to accomplish this skill
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={skillContent}
                  onChange={e => setSkillContent(e.target.value)}
                  className="font-mono min-h-[400px]"
                  disabled={skill.is_system}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>
                Reusable text templates with variables
              </CardDescription>
            </CardHeader>
            <CardContent>
              {skill.templates && skill.templates.length > 0 ? (
                <div className="space-y-4">
                  {skill.templates.map((template: SkillTemplate, i: number) => (
                    <Card key={i}>
                      <CardHeader>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                          {template.content}
                        </pre>
                        {template.variables && template.variables.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2">Variables:</p>
                            <div className="flex flex-wrap gap-2">
                              {template.variables.map((v, j) => (
                                <Badge key={j} variant="outline">
                                  {`{{${v.name}}}`}
                                  {v.required && <span className="text-destructive ml-1">*</span>}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No templates defined yet. Templates are reusable text blocks with variables.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edge Cases Tab */}
        <TabsContent value="edge-cases">
          <Card>
            <CardHeader>
              <CardTitle>Edge Cases</CardTitle>
              <CardDescription>
                Conditional rules for specific situations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {skill.edge_cases && skill.edge_cases.length > 0 ? (
                <div className="space-y-4">
                  {skill.edge_cases.map((edgeCase: SkillEdgeCase, i: number) => (
                    <Card key={i}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          When: {edgeCase.condition}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-1">
                          {edgeCase.instructions.map((instruction, j) => (
                            <li key={j} className="text-sm">{instruction}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No edge cases defined yet. Edge cases handle specific situations differently.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers">
          <Card>
            <CardHeader>
              <CardTitle>Triggers</CardTitle>
              <CardDescription>
                Phrases that activate this skill
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a trigger phrase..."
                  value={newTrigger}
                  onChange={e => setNewTrigger(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTrigger()}
                  disabled={skill.is_system}
                />
                <Button onClick={addTrigger} disabled={skill.is_system}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {triggers.map((trigger, i) => (
                  <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                    &quot;{trigger}&quot;
                    {!skill.is_system && (
                      <button
                        onClick={() => removeTrigger(trigger)}
                        className="ml-2 hover:text-destructive"
                      >
                        &times;
                      </button>
                    )}
                  </Badge>
                ))}
                {triggers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No triggers defined. Add phrases that should activate this skill.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learned Rules Tab */}
        <TabsContent value="learned-rules">
          <Card>
            <CardHeader>
              <CardTitle>Learned Rules</CardTitle>
              <CardDescription>
                Rules extracted from user teachings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {learnedRules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {learnedRules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <Badge variant="outline">{rule.rule_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate">{rule.rule_content}</p>
                          {rule.rule_description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {rule.rule_description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.scope === 'global' ? 'default' : 'secondary'}>
                            {rule.scope}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {Math.round(rule.confidence_score * 100)}%
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {rule.scope === 'workspace' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePromoteRule(rule.id)}
                              >
                                Promote
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
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
                <p className="text-center text-muted-foreground py-8">
                  No learned rules yet. Rules are created from user teachings.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                Track changes and rollback if needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Change Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map(version => (
                      <TableRow key={version.id}>
                        <TableCell>
                          <Badge variant="outline">v{version.version}</Badge>
                          {version.version === skill.version && (
                            <Badge variant="secondary" className="ml-2">Current</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{version.change_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {version.change_description || '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(version.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {version.version !== skill.version && !skill.is_system && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRollback(version.version)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Rollback
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No version history available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

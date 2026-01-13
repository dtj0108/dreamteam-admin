'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'

const categories = [
  { value: 'sales', label: 'Sales' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'communication', label: 'Communication' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'operations', label: 'Operations' },
  { value: 'general', label: 'General' },
]

const defaultSkillContent = `# Skill Name

## Overview
Brief description of what this skill does.

## Instructions

### Step 1: First Step
Description of the first step.

### Step 2: Second Step
Description of the second step.

## Notes
- Important consideration 1
- Important consideration 2
`

export default function NewSkillPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [skillContent, setSkillContent] = useState(defaultSkillContent)

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (!skillContent.trim()) {
      setError('Skill content is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category,
          skill_content: skillContent,
          triggers: [],
          templates: [],
          edge_cases: [],
          is_enabled: true
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create skill')
      }

      const data = await res.json()
      router.push(`/admin/skills/${data.skill.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create skill')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">New Skill</h1>
            <p className="text-muted-foreground">
              Create a new skill to teach agents how to accomplish tasks
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Creating...' : 'Create Skill'}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Basic skill information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., cold-outreach"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what this skill does..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
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

        {/* Content Editor */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Skill Content</CardTitle>
            <CardDescription>
              Write instructions in markdown. Include steps, guidelines, and tips.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="# Skill instructions..."
              value={skillContent}
              onChange={e => setSkillContent(e.target.value)}
              className="font-mono min-h-[400px]"
            />
          </CardContent>
        </Card>
      </div>

      <div className="text-sm text-muted-foreground">
        After creating the skill, you can add templates, edge cases, and triggers in the editor.
      </div>
    </div>
  )
}

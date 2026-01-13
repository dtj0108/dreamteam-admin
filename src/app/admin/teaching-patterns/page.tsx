'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import {
  TrendingUp,
  Sparkles,
  CheckCircle,
  Users,
  ArrowUpRight
} from 'lucide-react'
import type { TeachingPattern, AgentSkill, LearnedRuleType } from '@/types/skills'

interface PatternWithSkill extends TeachingPattern {
  skill?: AgentSkill | null
}

const ruleTypes: { value: LearnedRuleType; label: string }[] = [
  { value: 'instruction', label: 'Instruction' },
  { value: 'template', label: 'Template' },
  { value: 'edge_case', label: 'Edge Case' },
  { value: 'trigger', label: 'Trigger' },
  { value: 'tone', label: 'Tone' },
  { value: 'format', label: 'Format' },
]

export default function TeachingPatternsPage() {
  const [patterns, setPatterns] = useState<PatternWithSkill[]>([])
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const [minOccurrences, setMinOccurrences] = useState(2)
  const [showPromoted, setShowPromoted] = useState<string>('unpromoted')

  // Promote modal
  const [selectedPattern, setSelectedPattern] = useState<PatternWithSkill | null>(null)
  const [showPromote, setShowPromote] = useState(false)
  const [promoting, setPromoting] = useState(false)

  // Promote form
  const [ruleType, setRuleType] = useState<LearnedRuleType>('instruction')
  const [ruleContent, setRuleContent] = useState('')
  const [ruleDescription, setRuleDescription] = useState('')

  const fetchPatterns = useCallback(async () => {
    const params = new URLSearchParams()
    if (skillFilter !== 'all') params.set('skill_id', skillFilter)
    params.set('min_occurrences', minOccurrences.toString())
    if (showPromoted !== 'all') {
      params.set('is_promoted', showPromoted === 'promoted' ? 'true' : 'false')
    }

    const res = await fetch(`/api/admin/teaching-patterns?${params}`)
    if (res.ok) {
      const data = await res.json()
      setPatterns(data.patterns || [])
    }
    setLoading(false)
  }, [skillFilter, minOccurrences, showPromoted])

  const fetchSkills = useCallback(async () => {
    const res = await fetch('/api/admin/skills')
    if (res.ok) {
      const data = await res.json()
      setSkills(data.skills || [])
    }
  }, [])

  useEffect(() => {
    fetchPatterns()
    fetchSkills()
  }, [fetchPatterns, fetchSkills])

  function openPromote(pattern: PatternWithSkill) {
    setSelectedPattern(pattern)
    setRuleType('instruction')
    setRuleContent(pattern.pattern_description || '')
    setRuleDescription('')
    setShowPromote(true)
  }

  async function handlePromote() {
    if (!selectedPattern || !ruleContent) return

    setPromoting(true)
    try {
      const res = await fetch(`/api/admin/teaching-patterns/${selectedPattern.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_type: ruleType,
          rule_content: ruleContent,
          rule_description: ruleDescription || null
        })
      })

      if (res.ok) {
        setShowPromote(false)
        setSelectedPattern(null)
        fetchPatterns()
      }
    } finally {
      setPromoting(false)
    }
  }

  const stats = {
    total: patterns.length,
    promoted: patterns.filter(p => p.is_promoted).length,
    unpromoted: patterns.filter(p => !p.is_promoted).length,
    totalOccurrences: patterns.reduce((sum, p) => sum + p.occurrence_count, 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teaching Patterns</h1>
        <p className="text-muted-foreground">
          Recurring correction patterns that can be promoted to global rules
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Patterns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unpromoted</CardTitle>
            <Sparkles className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unpromoted}</div>
            <p className="text-xs text-muted-foreground">ready to review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Promoted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.promoted}</div>
            <p className="text-xs text-muted-foreground">global rules created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Occurrences</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOccurrences}</div>
            <p className="text-xs text-muted-foreground">across all patterns</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label>Skill</Label>
          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              {skills.map(skill => (
                <SelectItem key={skill.id} value={skill.id}>
                  {skill.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={showPromoted} onValueChange={setShowPromoted}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unpromoted">Unpromoted Only</SelectItem>
              <SelectItem value="promoted">Promoted Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-1 max-w-xs">
          <Label>Min Occurrences: {minOccurrences}</Label>
          <Slider
            value={[minOccurrences]}
            onValueChange={([v]) => setMinOccurrences(v)}
            min={2}
            max={20}
            step={1}
          />
        </div>
      </div>

      {/* Patterns Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : patterns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No patterns found matching the criteria. Patterns emerge when similar corrections
            occur multiple times across different workspaces.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {patterns.map(pattern => (
            <Card key={pattern.id} className={pattern.is_promoted ? 'border-green-200 bg-green-50/50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {pattern.pattern_type}
                      {pattern.is_promoted && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {pattern.skill?.name || 'Unknown skill'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-lg">
                    {pattern.occurrence_count}x
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  {pattern.pattern_description || 'No description'}
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{pattern.workspace_ids?.length || 0} workspaces</span>
                </div>

                <div className="text-xs text-muted-foreground">
                  First seen: {new Date(pattern.first_seen_at).toLocaleDateString()}
                </div>

                {!pattern.is_promoted && (
                  <Button
                    onClick={() => openPromote(pattern)}
                    className="w-full"
                    size="sm"
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Promote to Global
                  </Button>
                )}

                {pattern.is_promoted && (
                  <Badge variant="outline" className="w-full justify-center py-2">
                    Promoted to global rule
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Promote Modal */}
      <Dialog open={showPromote} onOpenChange={setShowPromote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote Pattern to Global Rule</DialogTitle>
            <DialogDescription>
              Create a global learned rule that applies to all workspaces
            </DialogDescription>
          </DialogHeader>

          {selectedPattern && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm font-medium">Pattern</p>
                <p className="text-sm mt-1">{selectedPattern.pattern_description || selectedPattern.pattern_type}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Occurred {selectedPattern.occurrence_count} times across {selectedPattern.workspace_ids?.length || 0} workspaces
                </p>
              </div>

              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select value={ruleType} onValueChange={(v) => setRuleType(v as LearnedRuleType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleTypes.map(rt => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {rt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rule Content</Label>
                <Textarea
                  value={ruleContent}
                  onChange={e => setRuleContent(e.target.value)}
                  placeholder="The rule to apply..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={ruleDescription}
                  onChange={e => setRuleDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>

              <Button
                onClick={handlePromote}
                disabled={promoting || !ruleContent}
                className="w-full"
              >
                {promoting ? 'Promoting...' : 'Promote to Global Rule'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

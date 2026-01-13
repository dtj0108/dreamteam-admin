'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Lightbulb,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Users,
  Target,
  Briefcase,
  Settings
} from 'lucide-react'
import type { AgentSkill } from '@/types/skills'

interface CategoryConfig {
  key: string
  label: string
  icon: React.ElementType
  color: string
}

const categories: CategoryConfig[] = [
  { key: 'sales', label: 'Sales', icon: Target, color: 'text-green-600' },
  { key: 'productivity', label: 'Productivity', icon: TrendingUp, color: 'text-blue-600' },
  { key: 'communication', label: 'Communication', icon: Users, color: 'text-purple-600' },
  { key: 'analysis', label: 'Analysis', icon: Lightbulb, color: 'text-orange-600' },
  { key: 'operations', label: 'Operations', icon: Briefcase, color: 'text-cyan-600' },
  { key: 'general', label: 'General', icon: Settings, color: 'text-gray-600' },
]

export default function SkillsPage() {
  const router = useRouter()
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const fetchSkills = useCallback(async () => {
    const res = await fetch('/api/admin/skills')
    if (res.ok) {
      const data = await res.json()
      setSkills(data.skills || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  async function handleToggleEnabled(skill: AgentSkill) {
    const res = await fetch(`/api/admin/skills/${skill.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !skill.is_enabled })
    })

    if (res.ok) {
      fetchSkills()
    }
  }

  const filteredSkills = useMemo(() => {
    if (!searchQuery) return skills
    const query = searchQuery.toLowerCase()
    return skills.filter(
      s => s.name.toLowerCase().includes(query) ||
           (s.description && s.description.toLowerCase().includes(query))
    )
  }, [skills, searchQuery])

  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, AgentSkill[]> = {}
    for (const cat of categories) {
      grouped[cat.key] = filteredSkills.filter(s => s.category === cat.key)
    }
    // Also include uncategorized
    grouped['other'] = filteredSkills.filter(
      s => !categories.some(c => c.key === s.category)
    )
    return grouped
  }, [filteredSkills])

  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; enabled: number; rules: number }> = {}
    for (const cat of categories) {
      const catSkills = skills.filter(s => s.category === cat.key)
      stats[cat.key] = {
        total: catSkills.length,
        enabled: catSkills.filter(s => s.is_enabled).length,
        rules: catSkills.reduce((sum, s) => sum + (s.learned_rules_count || 0), 0)
      }
    }
    return stats
  }, [skills])

  function toggleCategory(key: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function expandAll() {
    setExpandedCategories(new Set(categories.map(c => c.key)))
  }

  function collapseAll() {
    setExpandedCategories(new Set())
  }

  const totalSkills = skills.length
  const enabledSkills = skills.filter(s => s.is_enabled).length
  const totalRules = skills.reduce((sum, s) => sum + (s.learned_rules_count || 0), 0)
  const systemSkills = skills.filter(s => s.is_system).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skills Library</h1>
          <p className="text-muted-foreground">
            Workflows and procedures that teach agents how to accomplish tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Button onClick={() => router.push('/admin/skills/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Skill
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSkills}</div>
            <p className="text-xs text-muted-foreground">
              {systemSkills} system, {totalSkills - systemSkills} custom
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enabledSkills}</div>
            <p className="text-xs text-muted-foreground">
              {totalSkills > 0 ? Math.round((enabledSkills / totalSkills) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Learned Rules</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRules}</div>
            <p className="text-xs text-muted-foreground">from user teachings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Search Results</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSkills.length}</div>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? 'matching skills' : 'all skills'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {categories.map(cat => {
          const Icon = cat.icon
          const stats = categoryStats[cat.key] || { total: 0, enabled: 0, rules: 0 }
          return (
            <Card
              key={cat.key}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => toggleCategory(cat.key)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${cat.color}`} />
                  {cat.label}
                </CardTitle>
                <Badge variant="outline">{stats.total}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {stats.rules > 0 && (
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {stats.rules} learned rules
                    </span>
                  )}
                  {stats.rules === 0 && `${stats.enabled} enabled`}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search skills by name or description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Skills by Category */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map(cat => {
            const Icon = cat.icon
            const catSkills = skillsByCategory[cat.key] || []
            const isExpanded = expandedCategories.has(cat.key)
            const stats = categoryStats[cat.key] || { total: 0, enabled: 0, rules: 0 }

            if (searchQuery && catSkills.length === 0) return null

            return (
              <Collapsible
                key={cat.key}
                open={isExpanded}
                onOpenChange={() => toggleCategory(cat.key)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                          <Icon className={`h-5 w-5 ${cat.color}`} />
                          {cat.label}
                          <Badge variant="secondary" className="ml-2">
                            {catSkills.length} skills
                          </Badge>
                          {stats.rules > 0 && (
                            <Badge variant="outline" className="ml-1">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {stats.rules} rules
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {stats.enabled} / {stats.total} enabled
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {catSkills.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          No skills in this category yet.
                        </p>
                      ) : (
                        <div className="divide-y">
                          {catSkills.map(skill => (
                            <div
                              key={skill.id}
                              className="flex items-center justify-between py-4"
                            >
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => router.push(`/admin/skills/${skill.id}`)}
                              >
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {skill.name}
                                  </p>
                                  {skill.is_system && (
                                    <Badge variant="outline" className="text-xs">System</Badge>
                                  )}
                                  {skill.learned_rules_count > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      {skill.learned_rules_count}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {skill.description || 'No description'}
                                </p>
                                {skill.triggers && skill.triggers.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {skill.triggers.slice(0, 3).map((trigger, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        &quot;{typeof trigger === 'string' ? trigger : trigger.phrase}&quot;
                                      </Badge>
                                    ))}
                                    {skill.triggers.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{skill.triggers.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 ml-4">
                                <Badge variant={skill.is_enabled ? 'default' : 'secondary'}>
                                  {skill.is_enabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                                <Switch
                                  checked={skill.is_enabled}
                                  onCheckedChange={() => handleToggleEnabled(skill)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>
      )}
    </div>
  )
}

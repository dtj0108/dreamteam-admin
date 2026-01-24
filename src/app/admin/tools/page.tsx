'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Wrench,
  Search,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Target,
  Users,
  FolderKanban,
  BookOpen,
  Phone,
  TrendingUp,
  Bot
} from 'lucide-react'

interface Tool {
  id: string
  name: string
  description: string | null
  category: string
  input_schema: Record<string, unknown>
  is_builtin: boolean
  is_enabled: boolean
  created_at: string
}

interface DepartmentConfig {
  key: string
  label: string
  icon: React.ElementType
  color: string
  expectedCount: number
}

const departments: DepartmentConfig[] = [
  { key: 'finance', label: 'Finance', icon: DollarSign, color: 'text-green-600', expectedCount: 62 },
  { key: 'crm', label: 'CRM', icon: Target, color: 'text-blue-600', expectedCount: 53 },
  { key: 'team', label: 'Team', icon: Users, color: 'text-purple-600', expectedCount: 38 },
  { key: 'projects', label: 'Projects', icon: FolderKanban, color: 'text-orange-600', expectedCount: 40 },
  { key: 'knowledge', label: 'Knowledge', icon: BookOpen, color: 'text-cyan-600', expectedCount: 36 },
  { key: 'communications', label: 'Communications', icon: Phone, color: 'text-pink-600', expectedCount: 14 },
  { key: 'goals', label: 'Goals & KPIs', icon: TrendingUp, color: 'text-yellow-600', expectedCount: 21 },
  { key: 'agents', label: 'Agents', icon: Bot, color: 'text-indigo-600', expectedCount: 27 },
]

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set())

  const fetchTools = useCallback(async () => {
    const res = await fetch('/api/admin/agent-tools')
    if (res.ok) {
      const data = await res.json()
      setTools(data.tools || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTools()
  }, [fetchTools])

  async function handleToggleEnabled(tool: Tool) {
    const res = await fetch(`/api/admin/agent-tools/${tool.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !tool.is_enabled })
    })

    if (res.ok) {
      fetchTools()
    }
  }

  const filteredTools = useMemo(() => {
    if (!searchQuery) return tools
    const query = searchQuery.toLowerCase()
    return tools.filter(
      t => t.name.toLowerCase().includes(query) ||
           (t.description && t.description.toLowerCase().includes(query))
    )
  }, [tools, searchQuery])

  const toolsByDepartment = useMemo(() => {
    const grouped: Record<string, Tool[]> = {}
    for (const dept of departments) {
      grouped[dept.key] = filteredTools.filter(t => t.category === dept.key)
    }
    return grouped
  }, [filteredTools])

  const departmentStats = useMemo(() => {
    const stats: Record<string, { total: number; enabled: number }> = {}
    for (const dept of departments) {
      const deptTools = tools.filter(t => t.category === dept.key)
      stats[dept.key] = {
        total: deptTools.length,
        enabled: deptTools.filter(t => t.is_enabled).length
      }
    }
    return stats
  }, [tools])

  function toggleDepartment(key: string) {
    setExpandedDepartments(prev => {
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
    setExpandedDepartments(new Set(departments.map(d => d.key)))
  }

  function collapseAll() {
    setExpandedDepartments(new Set())
  }

  const totalTools = tools.length
  const enabledTools = tools.filter(t => t.is_enabled).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP Tools Registry</h1>
          <p className="text-muted-foreground">
            {totalTools} tools across 8 departments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTools}</div>
            <p className="text-xs text-muted-foreground">across 8 departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enabledTools}</div>
            <p className="text-xs text-muted-foreground">
              {totalTools > 0 ? Math.round((enabledTools / totalTools) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTools - enabledTools}</div>
            <p className="text-xs text-muted-foreground">tools turned off</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Search Results</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTools.length}</div>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? 'matching tools' : 'all tools'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {departments.map(dept => {
          const Icon = dept.icon
          const stats = departmentStats[dept.key] || { total: 0, enabled: 0 }
          return (
            <Card
              key={dept.key}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => toggleDepartment(dept.key)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${dept.color}`} />
                  {dept.label}
                </CardTitle>
                <Badge variant="outline">{stats.total}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {stats.enabled} enabled
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
          placeholder="Search tools by name or description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tools by Department */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {departments.map(dept => {
            const Icon = dept.icon
            const deptTools = toolsByDepartment[dept.key] || []
            const isExpanded = expandedDepartments.has(dept.key)
            const stats = departmentStats[dept.key] || { total: 0, enabled: 0 }

            if (searchQuery && deptTools.length === 0) return null

            return (
              <Collapsible
                key={dept.key}
                open={isExpanded}
                onOpenChange={() => toggleDepartment(dept.key)}
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
                          <Icon className={`h-5 w-5 ${dept.color}`} />
                          {dept.label}
                          <Badge variant="secondary" className="ml-2">
                            {deptTools.length} tools
                          </Badge>
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {stats.enabled} / {stats.total} enabled
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {deptTools.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          No tools in this department. Run the migration to seed them.
                        </p>
                      ) : (
                        <div className="divide-y">
                          {deptTools.map(tool => (
                            <div
                              key={tool.id}
                              className="flex items-center justify-between py-3"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-mono text-sm font-medium">
                                  {tool.name}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {tool.description || 'No description'}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 ml-4">
                                <Badge variant={tool.is_enabled ? 'default' : 'secondary'}>
                                  {tool.is_enabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                                <Switch
                                  checked={tool.is_enabled}
                                  onCheckedChange={() => handleToggleEnabled(tool)}
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

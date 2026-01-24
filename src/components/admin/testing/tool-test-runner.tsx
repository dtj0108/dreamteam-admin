'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Wrench,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Clock,
  FileJson,
  Cpu,
  Zap
} from 'lucide-react'
import type { AgentTool, ProductionTestResult, MCPTestResult, ToolCategory } from '@/types/agents'

interface Workspace {
  id: string
  name: string
}

interface ToolTestRunnerProps {
  tools: AgentTool[]
  workspaces: Workspace[]
  loading?: boolean
}

type TestTab = 'schema' | 'ai-sdk' | 'mcp'

const categoryLabels: Record<ToolCategory, string> = {
  finance: 'Finance',
  crm: 'CRM',
  team: 'Team',
  projects: 'Projects',
  knowledge: 'Knowledge',
  communications: 'Communications',
  goals: 'Goals',
  agents: 'Agents'
}

export function ToolTestRunner({ tools, workspaces, loading }: ToolTestRunnerProps) {
  const [activeTab, setActiveTab] = useState<TestTab>('schema')
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('')

  // Schema validation state
  const [schemaResults, setSchemaResults] = useState<ProductionTestResult[]>([])
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaProgress, setSchemaProgress] = useState({ completed: 0, total: 0 })

  // MCP test state
  const [mcpResults, setMcpResults] = useState<MCPTestResult[]>([])
  const [mcpLoading, setMcpLoading] = useState(false)
  const [mcpProgress, setMcpProgress] = useState({ completed: 0, total: 0 })

  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  const categories = Array.from(new Set(tools.map(t => t.category)))

  const filteredTools = selectedCategory === 'all'
    ? tools
    : tools.filter(t => t.category === selectedCategory)

  const enabledTools = filteredTools.filter(t => t.is_enabled)

  const toggleTool = useCallback((toolId: string) => {
    setSelectedToolIds(prev => {
      const next = new Set(prev)
      if (next.has(toolId)) {
        next.delete(toolId)
      } else {
        next.add(toolId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedToolIds(new Set(enabledTools.map(t => t.id)))
  }, [enabledTools])

  const selectNone = useCallback(() => {
    setSelectedToolIds(new Set())
  }, [])

  // Run AI SDK test (schema validation with Claude)
  async function runSchemaTest() {
    if (selectedToolIds.size === 0) return

    setSchemaLoading(true)
    setSchemaResults([])
    setSchemaProgress({ completed: 0, total: selectedToolIds.size })

    try {
      const res = await fetch('/api/admin/agents/tools/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_ids: Array.from(selectedToolIds)
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSchemaResults(data.results || [])
        setSchemaProgress({ completed: data.results?.length || 0, total: selectedToolIds.size })
      }
    } catch (err) {
      console.error('Schema test error:', err)
    } finally {
      setSchemaLoading(false)
    }
  }

  // Run MCP execution test
  async function runMcpTest() {
    if (selectedToolIds.size === 0 || !selectedWorkspaceId) return

    setMcpLoading(true)
    setMcpResults([])
    setMcpProgress({ completed: 0, total: selectedToolIds.size })

    try {
      const res = await fetch('/api/admin/agents/tools/test-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_ids: Array.from(selectedToolIds),
          workspace_id: selectedWorkspaceId
        })
      })

      if (res.ok) {
        const data = await res.json()
        setMcpResults(data.results || [])
        setMcpProgress({ completed: data.results?.length || 0, total: selectedToolIds.size })
      }
    } catch (err) {
      console.error('MCP test error:', err)
    } finally {
      setMcpLoading(false)
    }
  }

  const schemaPassCount = schemaResults.filter(r => r.success).length
  const mcpPassCount = mcpResults.filter(r => r.success).length

  return (
    <div className="space-y-6">
      {/* Tool Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tools to Test</CardTitle>
          <CardDescription>Choose tools by category or select individual tools</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat as ToolCategory] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All ({enabledTools.length})
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone}>
              Clear
            </Button>

            <Badge variant="secondary" className="ml-auto">
              {selectedToolIds.size} selected
            </Badge>
          </div>

          <ScrollArea className="h-[200px] border rounded-lg p-3">
            <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {enabledTools.map(tool => (
                <label
                  key={tool.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedToolIds.has(tool.id)}
                    onCheckedChange={() => toggleTool(tool.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabels[tool.category as ToolCategory]}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Test Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TestTab)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="schema" className="flex items-center gap-1.5">
            <FileJson className="h-4 w-4" />
            Schema Validation
          </TabsTrigger>
          <TabsTrigger value="ai-sdk" className="flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            AI SDK Test
          </TabsTrigger>
          <TabsTrigger value="mcp" className="flex items-center gap-1.5">
            <Cpu className="h-4 w-4" />
            MCP Execution
          </TabsTrigger>
        </TabsList>

        {/* AI SDK Test */}
        <TabsContent value="ai-sdk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI SDK Test</CardTitle>
              <CardDescription>
                Test tools with Claude API invocation to validate that schemas work correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={runSchemaTest}
                disabled={selectedToolIds.size === 0 || schemaLoading}
              >
                {schemaLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Run Test ({selectedToolIds.size} tools)
              </Button>

              {schemaLoading && (
                <div className="space-y-2">
                  <Progress value={(schemaProgress.completed / schemaProgress.total) * 100} />
                  <p className="text-sm text-muted-foreground">
                    Testing {schemaProgress.completed}/{schemaProgress.total}...
                  </p>
                </div>
              )}

              {schemaResults.length > 0 && (
                <TestResultsList
                  results={schemaResults}
                  expandedId={expandedResult}
                  onToggle={setExpandedResult}
                  passCount={schemaPassCount}
                  type="schema"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema Validation (same as AI SDK for now) */}
        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schema Validation</CardTitle>
              <CardDescription>
                Validate JSON schemas for selected tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={runSchemaTest}
                disabled={selectedToolIds.size === 0 || schemaLoading}
              >
                {schemaLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Validate Schemas ({selectedToolIds.size} tools)
              </Button>

              {schemaLoading && (
                <div className="space-y-2">
                  <Progress value={(schemaProgress.completed / schemaProgress.total) * 100} />
                  <p className="text-sm text-muted-foreground">
                    Validating {schemaProgress.completed}/{schemaProgress.total}...
                  </p>
                </div>
              )}

              {schemaResults.length > 0 && (
                <TestResultsList
                  results={schemaResults}
                  expandedId={expandedResult}
                  onToggle={setExpandedResult}
                  passCount={schemaPassCount}
                  type="schema"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MCP Execution Test */}
        <TabsContent value="mcp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP Execution Test</CardTitle>
              <CardDescription>
                Execute tools on the MCP server with real database operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select workspace context..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map(ws => (
                      <SelectItem key={ws.id} value={ws.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {ws.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={runMcpTest}
                  disabled={selectedToolIds.size === 0 || !selectedWorkspaceId || mcpLoading}
                >
                  {mcpLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Run MCP Test
                </Button>
              </div>

              {mcpLoading && (
                <div className="space-y-2">
                  <Progress value={(mcpProgress.completed / mcpProgress.total) * 100} />
                  <p className="text-sm text-muted-foreground">
                    Testing {mcpProgress.completed}/{mcpProgress.total}...
                  </p>
                </div>
              )}

              {mcpResults.length > 0 && (
                <MCPResultsList
                  results={mcpResults}
                  expandedId={expandedResult}
                  onToggle={setExpandedResult}
                  passCount={mcpPassCount}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface TestResultsListProps {
  results: ProductionTestResult[]
  expandedId: string | null
  onToggle: (id: string | null) => void
  passCount: number
  type: 'schema' | 'mcp'
}

function TestResultsList({ results, expandedId, onToggle, passCount }: TestResultsListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          {passCount} passed
        </Badge>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          {results.length - passCount} failed
        </Badge>
      </div>

      <div className="border rounded-lg divide-y">
        {results.map(result => (
          <Collapsible
            key={result.toolId}
            open={expandedId === result.toolId}
            onOpenChange={(open) => onToggle(open ? result.toolId : null)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{result.toolName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {result.latencyMs}ms
                </span>
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? (
                    <CheckCircle className="mr-1 h-3 w-3" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  {result.success ? 'Pass' : 'Fail'}
                </Badge>
                {expandedId === result.toolId ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              {result.error && (
                <div className="p-2 bg-destructive/10 rounded text-sm text-destructive">
                  {result.error}
                </div>
              )}
              {result.toolInput && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Tool Input:</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.toolInput, null, 2)}
                  </pre>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}

interface MCPResultsListProps {
  results: MCPTestResult[]
  expandedId: string | null
  onToggle: (id: string | null) => void
  passCount: number
}

function MCPResultsList({ results, expandedId, onToggle, passCount }: MCPResultsListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          {passCount} passed
        </Badge>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          {results.length - passCount} failed
        </Badge>
      </div>

      <div className="border rounded-lg divide-y">
        {results.map(result => (
          <Collapsible
            key={result.toolId}
            open={expandedId === result.toolId}
            onOpenChange={(open) => onToggle(open ? result.toolId : null)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{result.toolName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {result.latencyMs}ms
                </span>
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? (
                    <CheckCircle className="mr-1 h-3 w-3" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  {result.success ? 'Pass' : 'Fail'}
                </Badge>
                {expandedId === result.toolId ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              {result.error && (
                <div className="p-2 bg-destructive/10 rounded text-sm text-destructive">
                  {result.error}
                </div>
              )}
              {result.result !== undefined && result.result !== null && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Result:</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-[200px]">
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}

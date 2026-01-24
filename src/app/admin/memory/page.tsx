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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Brain,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  Database,
  FileText,
  User,
  Building2,
  Bot,
  Clock,
  TrendingDown,
  Plus,
  Loader2
} from 'lucide-react'
import type {
  MemoryFact,
  MemorySummary,
  MemoryEpisode,
  FactType,
  MemoryScope,
  SummaryCategory
} from '@/types/memory'

interface Workspace {
  id: string
  name: string
}

interface MemoryStats {
  totalEpisodes: number
  processedEpisodes: number
  unprocessedEpisodes: number
  totalFacts: number
  activeFacts: number
  totalSummaries: number
  factsByType: Record<FactType, number>
  factsByScope: Record<MemoryScope, number>
}

const factTypeColors: Record<FactType, string> = {
  preference: 'bg-purple-100 text-purple-800',
  context: 'bg-blue-100 text-blue-800',
  knowledge: 'bg-green-100 text-green-800',
  relationship: 'bg-orange-100 text-orange-800',
}

const scopeIcons: Record<MemoryScope, React.ElementType> = {
  user: User,
  workspace: Building2,
  agent: Bot,
}

export default function MemoryPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('')
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Facts state
  const [facts, setFacts] = useState<MemoryFact[]>([])
  const [factsTotal, setFactsTotal] = useState(0)
  const [factTypeFilter, setFactTypeFilter] = useState<string>('all')
  const [factScopeFilter, setFactScopeFilter] = useState<string>('all')

  // Summaries state
  const [summaries, setSummaries] = useState<MemorySummary[]>([])
  const [summariesTotal, setSummariesTotal] = useState(0)

  // Episodes state
  const [episodes, setEpisodes] = useState<MemoryEpisode[]>([])
  const [episodesTotal, setEpisodesTotal] = useState(0)
  const [episodeProcessedFilter, setEpisodeProcessedFilter] = useState<string>('all')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MemoryFact[]>([])
  const [searching, setSearching] = useState(false)

  // Detail modals
  const [selectedFact, setSelectedFact] = useState<MemoryFact | null>(null)
  const [showFactDetail, setShowFactDetail] = useState(false)
  const [showAddFact, setShowAddFact] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Add fact form
  const [newFactContent, setNewFactContent] = useState('')
  const [newFactType, setNewFactType] = useState<FactType>('context')
  const [newFactScope, setNewFactScope] = useState<MemoryScope>('workspace')
  const [newFactImportance, setNewFactImportance] = useState('0.7')
  const [addingFact, setAddingFact] = useState(false)

  // Operations
  const [processing, setProcessing] = useState(false)
  const [consolidating, setConsolidating] = useState(false)

  // Fetch workspaces
  useEffect(() => {
    async function fetchWorkspaces() {
      const res = await fetch('/api/admin/workspaces?limit=100')
      if (res.ok) {
        const data = await res.json()
        setWorkspaces(data.workspaces || [])
        if (data.workspaces?.length > 0) {
          setSelectedWorkspace(data.workspaces[0].id)
        }
      }
      setLoading(false)
    }
    fetchWorkspaces()
  }, [])

  // Fetch stats when workspace changes
  const fetchStats = useCallback(async () => {
    if (!selectedWorkspace) return
    const res = await fetch(`/api/admin/memory/stats?workspace_id=${selectedWorkspace}`)
    if (res.ok) {
      const data = await res.json()
      setStats(data)
    }
  }, [selectedWorkspace])

  // Fetch facts
  const fetchFacts = useCallback(async () => {
    if (!selectedWorkspace) return
    const params = new URLSearchParams({ workspace_id: selectedWorkspace })
    if (factTypeFilter !== 'all') params.set('fact_type', factTypeFilter)
    if (factScopeFilter !== 'all') params.set('scope', factScopeFilter)

    const res = await fetch(`/api/admin/memory/facts?${params}`)
    if (res.ok) {
      const data = await res.json()
      setFacts(data.facts || [])
      setFactsTotal(data.total || 0)
    }
  }, [selectedWorkspace, factTypeFilter, factScopeFilter])

  // Fetch summaries
  const fetchSummaries = useCallback(async () => {
    if (!selectedWorkspace) return
    const res = await fetch(`/api/admin/memory/summaries?workspace_id=${selectedWorkspace}`)
    if (res.ok) {
      const data = await res.json()
      setSummaries(data.summaries || [])
      setSummariesTotal(data.total || 0)
    }
  }, [selectedWorkspace])

  // Fetch episodes
  const fetchEpisodes = useCallback(async () => {
    if (!selectedWorkspace) return
    const params = new URLSearchParams({ workspace_id: selectedWorkspace })
    if (episodeProcessedFilter !== 'all') {
      params.set('is_processed', episodeProcessedFilter === 'processed' ? 'true' : 'false')
    }

    const res = await fetch(`/api/admin/memory/episodes?${params}`)
    if (res.ok) {
      const data = await res.json()
      setEpisodes(data.episodes || [])
      setEpisodesTotal(data.total || 0)
    }
  }, [selectedWorkspace, episodeProcessedFilter])

  useEffect(() => {
    if (selectedWorkspace) {
      fetchStats()
      fetchFacts()
      fetchSummaries()
      fetchEpisodes()
    }
  }, [selectedWorkspace, fetchStats, fetchFacts, fetchSummaries, fetchEpisodes])

  // Semantic search
  async function handleSearch() {
    if (!searchQuery.trim() || !selectedWorkspace) return

    setSearching(true)
    try {
      const res = await fetch('/api/admin/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: selectedWorkspace,
          query: searchQuery,
          limit: 20
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.facts || [])
      }
    } finally {
      setSearching(false)
    }
  }

  // Add fact
  async function handleAddFact() {
    if (!newFactContent.trim() || !selectedWorkspace) return

    setAddingFact(true)
    try {
      const res = await fetch('/api/admin/memory/facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: selectedWorkspace,
          content: newFactContent,
          fact_type: newFactType,
          scope: newFactScope,
          importance: parseFloat(newFactImportance)
        })
      })

      if (res.ok) {
        setShowAddFact(false)
        setNewFactContent('')
        fetchFacts()
        fetchStats()
      }
    } finally {
      setAddingFact(false)
    }
  }

  // Delete fact
  async function handleDeleteFact(factId: string) {
    const res = await fetch(`/api/admin/memory/facts/${factId}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      setDeleteConfirm(null)
      setShowFactDetail(false)
      fetchFacts()
      fetchStats()
    }
  }

  // Process episodes
  async function handleProcessEpisodes() {
    if (!selectedWorkspace) return

    setProcessing(true)
    try {
      const res = await fetch('/api/admin/memory/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: selectedWorkspace })
      })

      if (res.ok) {
        fetchEpisodes()
        fetchFacts()
        fetchStats()
      }
    } finally {
      setProcessing(false)
    }
  }

  // Consolidate memories
  async function handleConsolidate() {
    if (!selectedWorkspace) return

    setConsolidating(true)
    try {
      const res = await fetch('/api/admin/memory/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: selectedWorkspace })
      })

      if (res.ok) {
        fetchSummaries()
        fetchStats()
      }
    } finally {
      setConsolidating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Memory</h1>
          <p className="text-muted-foreground">
            Manage agent memories, facts, and summaries
          </p>
        </div>

        <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map(ws => (
              <SelectItem key={ws.id} value={ws.id}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Episodes</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEpisodes}</div>
              <p className="text-xs text-muted-foreground">
                {stats.unprocessedEpisodes} unprocessed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Facts</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeFacts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalFacts - stats.activeFacts} inactive
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Summaries</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSummaries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">By Scope</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 text-sm">
                <span>User: {stats.factsByScope.user}</span>
                <span>WS: {stats.factsByScope.workspace}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Semantic Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search memories semantically..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Found {searchResults.length} results
              </p>
              {searchResults.map(fact => (
                <div
                  key={fact.id}
                  className="p-3 border rounded-md cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedFact(fact)
                    setShowFactDetail(true)
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={factTypeColors[fact.fact_type]}>
                      {fact.fact_type}
                    </Badge>
                    <Badge variant="outline">{fact.scope}</Badge>
                  </div>
                  <p className="text-sm">{fact.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="facts">
        <TabsList>
          <TabsTrigger value="facts">Facts ({factsTotal})</TabsTrigger>
          <TabsTrigger value="summaries">Summaries ({summariesTotal})</TabsTrigger>
          <TabsTrigger value="episodes">Episodes ({episodesTotal})</TabsTrigger>
        </TabsList>

        {/* Facts Tab */}
        <TabsContent value="facts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Memory Facts</CardTitle>
                  <CardDescription>
                    Individual extracted memories with embeddings
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={factTypeFilter} onValueChange={setFactTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="preference">Preference</SelectItem>
                      <SelectItem value="context">Context</SelectItem>
                      <SelectItem value="knowledge">Knowledge</SelectItem>
                      <SelectItem value="relationship">Relationship</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={factScopeFilter} onValueChange={setFactScopeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scopes</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="workspace">Workspace</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setShowAddFact(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Fact
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {facts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No facts found. Facts are extracted from agent interactions.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead className="w-[400px]">Content</TableHead>
                      <TableHead>Importance</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facts.map(fact => {
                      const ScopeIcon = scopeIcons[fact.scope]
                      return (
                        <TableRow key={fact.id}>
                          <TableCell>
                            <Badge className={factTypeColors[fact.fact_type]}>
                              {fact.fact_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <ScopeIcon className="h-3 w-3" />
                              {fact.scope}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[400px]">
                            <p className="truncate text-sm">{fact.content}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${fact.importance * 40}px` }}
                              />
                              {Math.round(fact.importance * 100)}%
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(fact.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedFact(fact)
                                  setShowFactDetail(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(fact.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summaries Tab */}
        <TabsContent value="summaries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Memory Summaries</CardTitle>
                  <CardDescription>
                    Consolidated knowledge from multiple facts
                  </CardDescription>
                </div>
                <Button onClick={handleConsolidate} disabled={consolidating}>
                  {consolidating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Consolidate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {summaries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No summaries yet. Click Consolidate to generate summaries from facts.
                </p>
              ) : (
                <div className="space-y-4">
                  {summaries.map(summary => (
                    <Card key={summary.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{summary.title}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="outline">{summary.category}</Badge>
                            <Badge variant="outline">{summary.scope}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{summary.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {summary.fact_count} facts | Consolidated {summary.consolidation_count} times
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Episodes Tab */}
        <TabsContent value="episodes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Memory Episodes</CardTitle>
                  <CardDescription>
                    Raw interaction logs awaiting fact extraction
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={episodeProcessedFilter} onValueChange={setEpisodeProcessedFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Episodes</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="unprocessed">Unprocessed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleProcessEpisodes} disabled={processing}>
                    {processing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Process
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {episodes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No episodes found. Episodes are created from agent interactions.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {episodes.map(episode => (
                      <TableRow key={episode.id}>
                        <TableCell>
                          <Badge variant="outline">{episode.episode_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {episode.is_processed ? (
                            <Badge className="bg-green-100 text-green-800">
                              Processed
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(episode.started_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {episode.processed_at
                            ? new Date(episode.processed_at).toLocaleString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fact Detail Modal */}
      <Dialog open={showFactDetail} onOpenChange={setShowFactDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fact Details</DialogTitle>
          </DialogHeader>

          {selectedFact && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={factTypeColors[selectedFact.fact_type]}>
                  {selectedFact.fact_type}
                </Badge>
                <Badge variant="outline">{selectedFact.scope}</Badge>
                {!selectedFact.is_active && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>

              <div>
                <Label>Content</Label>
                <p className="mt-1 p-3 bg-muted rounded-md text-sm">
                  {selectedFact.content}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Importance</Label>
                  <p className="text-sm font-medium">
                    {Math.round(selectedFact.importance * 100)}%
                  </p>
                </div>
                <div>
                  <Label>Confidence</Label>
                  <p className="text-sm font-medium">
                    {Math.round(selectedFact.confidence * 100)}%
                  </p>
                </div>
                <div>
                  <Label>Decay Factor</Label>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    {Math.round(selectedFact.decay_factor * 100)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Access Count</Label>
                  <p className="text-sm font-medium">{selectedFact.access_count}</p>
                </div>
                <div>
                  <Label>Last Accessed</Label>
                  <p className="text-sm font-medium">
                    {selectedFact.last_accessed_at
                      ? new Date(selectedFact.last_accessed_at).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>Created: {new Date(selectedFact.created_at).toLocaleString()}</div>
                <div>Updated: {new Date(selectedFact.updated_at).toLocaleString()}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => selectedFact && setDeleteConfirm(selectedFact.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Fact Modal */}
      <Dialog open={showAddFact} onOpenChange={setShowAddFact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Memory Fact</DialogTitle>
            <DialogDescription>
              Manually add a fact to the memory system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="The fact to remember..."
                value={newFactContent}
                onChange={e => setNewFactContent(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newFactType}
                  onValueChange={v => setNewFactType(v as FactType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preference">Preference</SelectItem>
                    <SelectItem value="context">Context</SelectItem>
                    <SelectItem value="knowledge">Knowledge</SelectItem>
                    <SelectItem value="relationship">Relationship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select
                  value={newFactScope}
                  onValueChange={v => setNewFactScope(v as MemoryScope)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workspace">Workspace</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Importance (0-1)</Label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={newFactImportance}
                onChange={e => setNewFactImportance(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFact(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFact}
              disabled={addingFact || !newFactContent.trim()}
            >
              {addingFact ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Fact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory Fact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this fact from the memory system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteFact(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

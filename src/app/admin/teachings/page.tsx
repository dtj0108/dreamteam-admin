'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  GraduationCap,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Sparkles,
  Play
} from 'lucide-react'
import type { SkillTeaching, AgentSkill, LearnedRuleType } from '@/types/skills'

interface TeachingWithSkill extends Omit<SkillTeaching, 'skill'> {
  skill?: AgentSkill | null
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  analyzing: { label: 'Analyzing', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle },
}

const ruleTypes: { value: LearnedRuleType; label: string }[] = [
  { value: 'instruction', label: 'Instruction' },
  { value: 'template', label: 'Template' },
  { value: 'edge_case', label: 'Edge Case' },
  { value: 'trigger', label: 'Trigger' },
  { value: 'tone', label: 'Tone' },
  { value: 'format', label: 'Format' },
]

export default function TeachingsPage() {
  const [teachings, setTeachings] = useState<TeachingWithSkill[]>([])
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Filters
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Detail modal
  const [selectedTeaching, setSelectedTeaching] = useState<TeachingWithSkill | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [applying, setApplying] = useState(false)

  // Apply form
  const [ruleType, setRuleType] = useState<LearnedRuleType>('instruction')
  const [ruleContent, setRuleContent] = useState('')
  const [ruleDescription, setRuleDescription] = useState('')

  const fetchTeachings = useCallback(async () => {
    const params = new URLSearchParams()
    if (skillFilter !== 'all') params.set('skill_id', skillFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)

    const res = await fetch(`/api/admin/teachings?${params}`)
    if (res.ok) {
      const data = await res.json()
      setTeachings(data.teachings || [])
      setTotal(data.total || 0)
    }
    setLoading(false)
  }, [skillFilter, statusFilter])

  const fetchSkills = useCallback(async () => {
    const res = await fetch('/api/admin/skills')
    if (res.ok) {
      const data = await res.json()
      setSkills(data.skills || [])
    }
  }, [])

  useEffect(() => {
    fetchTeachings()
    fetchSkills()
  }, [fetchTeachings, fetchSkills])

  async function handleAnalyze(teaching: TeachingWithSkill) {
    setAnalyzing(true)
    try {
      const res = await fetch(`/api/admin/teachings/${teaching.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' })
      })

      if (res.ok) {
        const data = await res.json()
        setSelectedTeaching(data.teaching)
        // Pre-fill form with analysis result
        if (data.teaching.analysis_result) {
          setRuleType(data.teaching.analysis_result.suggestedRuleType || 'instruction')
          setRuleContent(data.teaching.analysis_result.suggestedRuleContent || '')
        }
        fetchTeachings()
      }
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleApply() {
    if (!selectedTeaching || !ruleContent) return

    setApplying(true)
    try {
      const res = await fetch(`/api/admin/teachings/${selectedTeaching.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          rule_type: ruleType,
          rule_content: ruleContent,
          rule_description: ruleDescription || null,
          scope: 'workspace'
        })
      })

      if (res.ok) {
        setShowDetail(false)
        setSelectedTeaching(null)
        fetchTeachings()
      }
    } finally {
      setApplying(false)
    }
  }

  function openDetail(teaching: TeachingWithSkill) {
    setSelectedTeaching(teaching)
    if (teaching.analysis_result) {
      setRuleType(teaching.analysis_result.suggestedRuleType || 'instruction')
      setRuleContent(teaching.analysis_result.suggestedRuleContent || '')
    } else {
      setRuleType('instruction')
      setRuleContent('')
    }
    setRuleDescription('')
    setShowDetail(true)
  }

  const stats = {
    total,
    pending: teachings.filter(t => t.analysis_status === 'pending').length,
    completed: teachings.filter(t => t.analysis_status === 'completed').length,
    failed: teachings.filter(t => t.analysis_status === 'failed').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teachings</h1>
        <p className="text-muted-foreground">
          User corrections that improve agent skills over time
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Teachings</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Analysis</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Analyzed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="analyzing">Analyzing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teachings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teaching History</CardTitle>
          <CardDescription>
            User corrections captured from agent interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : teachings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No teachings captured yet. Teachings are created when users correct agent outputs.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Original (preview)</TableHead>
                  <TableHead>Corrected (preview)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachings.map(teaching => {
                  const status = statusConfig[teaching.analysis_status] || statusConfig.pending
                  const StatusIcon = status.icon

                  return (
                    <TableRow key={teaching.id}>
                      <TableCell>
                        {new Date(teaching.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {teaching.skill?.name || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm">
                          {teaching.original_output.substring(0, 100)}...
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm">
                          {teaching.corrected_output.substring(0, 100)}...
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(teaching)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {teaching.analysis_status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAnalyze(teaching)}
                              disabled={analyzing}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Teaching Detail</DialogTitle>
            <DialogDescription>
              Review the correction and apply as a learned rule
            </DialogDescription>
          </DialogHeader>

          {selectedTeaching && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-4">
                <Badge className={statusConfig[selectedTeaching.analysis_status]?.color}>
                  {statusConfig[selectedTeaching.analysis_status]?.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Skill: {selectedTeaching.skill?.name || 'Unknown'}
                </span>
              </div>

              {/* Side by side comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-red-600">Original Output</Label>
                  <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-md text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {selectedTeaching.original_output}
                  </div>
                </div>
                <div>
                  <Label className="text-green-600">Corrected Output</Label>
                  <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-md text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {selectedTeaching.corrected_output}
                  </div>
                </div>
              </div>

              {selectedTeaching.user_instruction && (
                <div>
                  <Label>User Instruction</Label>
                  <p className="text-sm mt-1">{selectedTeaching.user_instruction}</p>
                </div>
              )}

              {/* Analysis Result */}
              {selectedTeaching.analysis_result && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Analysis Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Changes Identified</Label>
                      <ul className="mt-2 space-y-1">
                        {selectedTeaching.analysis_result.changes?.map((change, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Badge variant="outline" className="shrink-0">
                              {change.type}
                            </Badge>
                            <span>{change.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <Label>Reasoning</Label>
                      <p className="text-sm mt-1">{selectedTeaching.analysis_result.reasoning}</p>
                    </div>
                    <div>
                      <Label>Confidence</Label>
                      <p className="text-sm mt-1">
                        {Math.round((selectedTeaching.analysis_result.confidence || 0) * 100)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Apply as Rule Form */}
              {selectedTeaching.analysis_status === 'completed' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Apply as Learned Rule</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
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
                        <Label>Description (optional)</Label>
                        <Input
                          value={ruleDescription}
                          onChange={e => setRuleDescription(e.target.value)}
                          placeholder="Brief description of this rule"
                        />
                      </div>
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
                    <Button onClick={handleApply} disabled={applying || !ruleContent}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {applying ? 'Applying...' : 'Apply Rule'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Analyze Button */}
              {selectedTeaching.analysis_status === 'pending' && (
                <Button
                  onClick={() => handleAnalyze(selectedTeaching)}
                  disabled={analyzing}
                  className="w-full"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with Claude...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Analyze Teaching
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

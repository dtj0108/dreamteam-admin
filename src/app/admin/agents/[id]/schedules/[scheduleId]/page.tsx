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
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ArrowLeft,
  Save,
  Play,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Bell,
} from 'lucide-react'
import type { AgentSchedule, AgentScheduleExecution, ScheduleExecutionStatus } from '@/types/agents'
import { SCHEDULE_PRESETS } from '@/types/agents'
import { describeCron } from '@/lib/cron-utils'

function getStatusBadge(status: ScheduleExecutionStatus) {
  switch (status) {
    case 'pending_approval':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="mr-1 h-3 w-3" />Pending</Badge>
    case 'approved':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>
    case 'rejected':
      return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>
    case 'running':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Running</Badge>
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>
    case 'failed':
      return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Failed</Badge>
    case 'cancelled':
      return <Badge variant="secondary">Cancelled</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = (seconds % 60).toFixed(0)
  return `${minutes}m ${remainingSeconds}s`
}

function formatCost(cost: number | null): string {
  if (!cost) return '-'
  return `$${cost.toFixed(4)}`
}

function formatTokens(input: number | null, output: number | null): string {
  if (!input && !output) return '-'
  const total = (input || 0) + (output || 0)
  return total.toLocaleString()
}

export default function ScheduleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string
  const scheduleId = params.scheduleId as string

  // Core state
  const [schedule, setSchedule] = useState<AgentSchedule | null>(null)
  const [executions, setExecutions] = useState<AgentScheduleExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schedulePreset, setSchedulePreset] = useState('custom')
  const [cronExpression, setCronExpression] = useState('')
  const [taskPrompt, setTaskPrompt] = useState('')
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [executionDetailOpen, setExecutionDetailOpen] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<AgentScheduleExecution | null>(null)
  const [runningNow, setRunningNow] = useState(false)

  // Notification test state
  const [testingNotification, setTestingNotification] = useState(false)
  const [notificationTestResult, setNotificationTestResult] = useState<{
    success: boolean
    message: string
    details?: Record<string, unknown>
  } | null>(null)
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false)

  // Fetch schedule data
  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/schedules/${scheduleId}`)
      if (!res.ok) {
        throw new Error('Schedule not found')
      }

      const data = await res.json()
      setSchedule(data.schedule)
      setExecutions(data.executions || [])

      // Set form values
      setName(data.schedule.name)
      setDescription(data.schedule.description || '')
      setCronExpression(data.schedule.cron_expression)
      setTaskPrompt(data.schedule.task_prompt)
      setRequiresApproval(data.schedule.requires_approval)
      setIsEnabled(data.schedule.is_enabled)

      // Determine preset
      const matchingPreset = SCHEDULE_PRESETS.find(p => p.cron === data.schedule.cron_expression)
      setSchedulePreset(matchingPreset?.value || 'custom')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [agentId, scheduleId])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  // Save schedule
  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/agents/${agentId}/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          cron_expression: cronExpression,
          task_prompt: taskPrompt,
          requires_approval: requiresApproval,
          is_enabled: isEnabled,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      await fetchSchedule()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Toggle enabled
  async function handleToggleEnabled(enabled: boolean) {
    setIsEnabled(enabled)
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: enabled }),
      })

      if (!res.ok) {
        setIsEnabled(!enabled)
        const data = await res.json()
        setError(data.error || 'Failed to update')
      }
    } catch (err) {
      setIsEnabled(!enabled)
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  // Run now
  async function handleRunNow() {
    setRunningNow(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/agents/${agentId}/schedules/${scheduleId}/run`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to run')
      }

      // Refresh to get latest executions
      await fetchSchedule()

      // Show result - if execution failed, show error; otherwise show success with usage
      if (data.execution?.status === 'failed') {
        setError(`Execution failed: ${data.error || data.execution?.error_message || 'Unknown error'}`)
      } else if (data.execution) {
        // Auto-open the execution detail dialog
        setSelectedExecution(data.execution)
        setExecutionDetailOpen(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run')
    } finally {
      setRunningNow(false)
    }
  }

  // Delete schedule
  async function handleDelete() {
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/schedules/${scheduleId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }

      router.push(`/admin/agents/${agentId}?tab=schedules`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setDeleteDialogOpen(false)
    }
  }

  // Open execution detail
  function openExecutionDetail(execution: AgentScheduleExecution) {
    setSelectedExecution(execution)
    setExecutionDetailOpen(true)
  }

  // Test notification (without running the agent)
  async function handleTestNotification() {
    setTestingNotification(true)
    setNotificationTestResult(null)

    try {
      const res = await fetch('/api/admin/scheduled-tasks/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: scheduleId,
          status: 'completed',
        }),
      })

      const data = await res.json()

      setNotificationTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Notification sent successfully' : 'Failed to send notification'),
        details: data.details,
      })
      setNotificationDialogOpen(true)
    } catch (err) {
      setNotificationTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to test notification',
      })
      setNotificationDialogOpen(true)
    } finally {
      setTestingNotification(false)
    }
  }

  // Preview notification recipients (dry run)
  async function handlePreviewNotification() {
    setTestingNotification(true)
    setNotificationTestResult(null)

    try {
      const res = await fetch(`/api/admin/scheduled-tasks/test-notification?schedule_id=${scheduleId}`)
      const data = await res.json()

      setNotificationTestResult({
        success: data.can_send_notification ?? false,
        message: data.can_send_notification
          ? `Would notify ${data.recipient_count} recipient(s)`
          : (data.reason || 'Cannot send notification'),
        details: data,
      })
      setNotificationDialogOpen(true)
    } catch (err) {
      setNotificationTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to preview notification',
      })
      setNotificationDialogOpen(true)
    } finally {
      setTestingNotification(false)
    }
  }

  // Handle preset change
  function handlePresetChange(value: string) {
    setSchedulePreset(value)
    const preset = SCHEDULE_PRESETS.find(p => p.value === value)
    if (preset && preset.cron) {
      setCronExpression(preset.cron)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Schedule not found</p>
        <Button variant="link" onClick={() => router.push(`/admin/agents/${agentId}?tab=schedules`)}>
          Back to Agent
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/admin/agents/${agentId}?tab=schedules`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{schedule.name}</h1>
              {isEnabled ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
              {requiresApproval && (
                <Badge variant="outline">Requires Approval</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {describeCron(schedule.cron_expression)} ({schedule.timezone})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleEnabled}
          />
          <Button
            variant="outline"
            onClick={handlePreviewNotification}
            disabled={testingNotification}
            title="Preview notification recipients"
          >
            {testingNotification ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Test Notification
          </Button>
          <Button
            variant="outline"
            onClick={handleRunNow}
            disabled={runningNow}
          >
            {runningNow ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Now
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Configure the schedule settings and task</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekly Report"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the task"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Select value={schedulePreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label} - {preset.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {schedulePreset === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="cron">Cron Expression</Label>
                <Input
                  id="cron"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="0 9 * * *"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Format: minute hour day-of-month month day-of-week
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskPrompt">Task Prompt</Label>
            <Textarea
              id="taskPrompt"
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder="What should the agent do when this runs?"
              rows={6}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="requiresApproval"
              checked={requiresApproval}
              onCheckedChange={setRequiresApproval}
            />
            <Label htmlFor="requiresApproval">Require approval before running</Label>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Next run: {schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : 'Not scheduled'}</p>
            <p>Last run: {schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : 'Never'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Execution History Card */}
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
          <CardDescription>Recent executions of this schedule</CardDescription>
        </CardHeader>
        <CardContent>
          {executions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution) => (
                  <TableRow
                    key={execution.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openExecutionDetail(execution)}
                  >
                    <TableCell>
                      {new Date(execution.scheduled_for).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(execution.status)}
                    </TableCell>
                    <TableCell>
                      {execution.started_at
                        ? new Date(execution.started_at).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {formatDuration(execution.duration_ms)}
                    </TableCell>
                    <TableCell>
                      {formatTokens(execution.tokens_input, execution.tokens_output)}
                    </TableCell>
                    <TableCell>
                      {formatCost(execution.cost_usd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No executions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
              All execution history will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execution Detail Dialog */}
      <Dialog open={executionDetailOpen} onOpenChange={setExecutionDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Execution Details</DialogTitle>
            <DialogDescription>
              Scheduled for {selectedExecution && new Date(selectedExecution.scheduled_for).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedExecution && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Status</Label>
                    <div>{getStatusBadge(selectedExecution.status)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Scheduled For</Label>
                    <p className="text-sm">{new Date(selectedExecution.scheduled_for).toLocaleString()}</p>
                  </div>
                  {selectedExecution.started_at && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Started At</Label>
                      <p className="text-sm">{new Date(selectedExecution.started_at).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedExecution.completed_at && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Completed At</Label>
                      <p className="text-sm">{new Date(selectedExecution.completed_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Duration</Label>
                    <p className="text-sm">{formatDuration(selectedExecution.duration_ms)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Tokens (In/Out)</Label>
                    <p className="text-sm">
                      {selectedExecution.tokens_input?.toLocaleString() || 0} / {selectedExecution.tokens_output?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Total Tokens</Label>
                    <p className="text-sm">{formatTokens(selectedExecution.tokens_input, selectedExecution.tokens_output)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Cost</Label>
                    <p className="text-sm">{formatCost(selectedExecution.cost_usd)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Task Prompt</Label>
                  <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {taskPrompt}
                  </div>
                </div>

                {selectedExecution.result && (
                  <Collapsible>
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                        <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                        Result
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="mt-2">
                      <div className="p-3 bg-muted rounded-md text-sm overflow-auto max-h-48">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(selectedExecution.result, null, 2)}</pre>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {selectedExecution.tool_calls && selectedExecution.tool_calls.length > 0 && (
                  <Collapsible>
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                        <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                        Tool Calls ({selectedExecution.tool_calls.length})
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="mt-2">
                      <div className="p-3 bg-muted rounded-md text-sm overflow-auto max-h-64">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(selectedExecution.tool_calls, null, 2)}</pre>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {selectedExecution.error_message && (
                  <div className="space-y-2">
                    <Label className="text-destructive">Error</Label>
                    <div className="p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                      {selectedExecution.error_message}
                    </div>
                  </div>
                )}

                {selectedExecution.rejection_reason && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Rejection Reason</Label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {selectedExecution.rejection_reason}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecutionDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Test Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {notificationTestResult?.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Notification Test Result
            </DialogTitle>
            <DialogDescription>
              {notificationTestResult?.message}
            </DialogDescription>
          </DialogHeader>
          {notificationTestResult?.details && (
            <ScrollArea className="max-h-[400px]">
              <div className="p-3 bg-muted rounded-md text-sm overflow-auto">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(notificationTestResult.details, null, 2)}
                </pre>
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {Boolean(notificationTestResult?.details?.can_send_notification) && (
              <Button
                onClick={handleTestNotification}
                disabled={testingNotification}
              >
                {testingNotification ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Send Test Notification
              </Button>
            )}
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

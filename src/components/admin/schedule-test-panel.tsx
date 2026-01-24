'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  CheckCircle,
  XCircle,
  Bot,
  Loader2,
  Play,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Clock,
  Zap,
  DollarSign,
  Building2,
  Bell,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CronValidator } from './cron-validator'
import { ExecutionDetails } from './execution-details'
import { AgentScheduleExecution } from '@/types/agents'

interface Workspace {
  id: string
  name: string
}

interface Schedule {
  id: string
  name: string
  agent_id: string
  cron_expression: string
  timezone?: string
  is_enabled: boolean
  requires_approval: boolean
  task_prompt: string
  agent?: {
    id: string
    name: string
    is_enabled: boolean
    avatar_url: string | null
  }
}

interface TestResult {
  scheduleId: string
  scheduleName: string
  agentName: string
  success: boolean
  executionId?: string
  error?: string
  durationMs: number
  execution?: AgentScheduleExecution & {
    schedule?: {
      id: string
      name: string
      task_prompt: string
      cron_expression: string
    }
    agent?: {
      id: string
      name: string
      avatar_url: string | null
    }
  }
  rawApiResponse?: Record<string, unknown>
}

interface ScheduleTestPanelProps {
  schedules: Schedule[]
  onRefresh?: () => void
}

export function ScheduleTestPanel({ schedules, onRefresh }: ScheduleTestPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [testingAll, setTestingAll] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  // Notification test state
  const [testingNotification, setTestingNotification] = useState(false)
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false)
  const [notificationTestResult, setNotificationTestResult] = useState<{
    success: boolean
    message: string
    details?: Record<string, unknown>
  } | null>(null)

  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId)

  // Fetch workspaces on mount
  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const res = await fetch('/api/admin/workspaces')
        if (res.ok) {
          const data = await res.json()
          setWorkspaces(data.workspaces || [])
        }
      } catch (err) {
        console.error('Failed to fetch workspaces:', err)
      } finally {
        setLoadingWorkspaces(false)
      }
    }
    fetchWorkspaces()
  }, [])

  const runSingleTest = useCallback(async (schedule: Schedule): Promise<TestResult> => {
    const start = Date.now()
    const workspaceId = selectedWorkspaceId && selectedWorkspaceId !== 'none' ? selectedWorkspaceId : null
    try {
      const res = await fetch(
        `/api/admin/agents/${schedule.agent_id}/schedules/${schedule.id}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workspaceId ? { workspace_id: workspaceId } : {})
        }
      )
      const data = await res.json()

      // If we have an execution, fetch detailed info
      let execution = data.execution
      if (execution?.id) {
        // The run endpoint should return execution details
        execution = {
          ...execution,
          schedule: {
            id: schedule.id,
            name: schedule.name,
            task_prompt: schedule.task_prompt,
            cron_expression: schedule.cron_expression
          },
          agent: schedule.agent
        }
      }

      return {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        agentName: schedule.agent?.name || 'Unknown',
        success: res.ok,
        executionId: data.execution?.id,
        error: data.error,
        durationMs: Date.now() - start,
        execution,
        rawApiResponse: data
      }
    } catch (err) {
      return {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        agentName: schedule.agent?.name || 'Unknown',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        durationMs: Date.now() - start
      }
    }
  }, [selectedWorkspaceId])

  const runSelectedTest = async () => {
    if (!selectedSchedule) return

    setIsTesting(true)
    setTestResults([])

    const result = await runSingleTest(selectedSchedule)
    setTestResults([result])
    setExpandedResult(result.scheduleId)

    setIsTesting(false)
    onRefresh?.()
  }

  const runAllTests = async () => {
    setTestingAll(true)
    setTestResults([])

    const results: TestResult[] = []
    for (const schedule of schedules) {
      const result = await runSingleTest(schedule)
      results.push(result)
      setTestResults([...results])
    }

    setTestingAll(false)
    onRefresh?.()
  }

  // Preview notification recipients (dry run - no notification sent)
  const previewNotification = async () => {
    if (!selectedScheduleId) return

    setTestingNotification(true)
    setNotificationTestResult(null)

    try {
      const res = await fetch(`/api/admin/scheduled-tasks/test-notification?schedule_id=${selectedScheduleId}`)
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

  // Actually send a test notification
  const sendTestNotification = async () => {
    if (!selectedScheduleId) return

    setTestingNotification(true)

    try {
      const res = await fetch('/api/admin/scheduled-tasks/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: selectedScheduleId,
          status: 'completed',
        }),
      })

      const data = await res.json()

      setNotificationTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Notification sent successfully' : 'Failed to send notification'),
        details: data.details,
      })
    } catch (err) {
      setNotificationTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send notification',
      })
    } finally {
      setTestingNotification(false)
    }
  }

  const passedCount = testResults.filter(r => r.success).length
  const failedCount = testResults.filter(r => !r.success).length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-6">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Test Panel</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {testResults.length > 0 && (
                  <>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {passedCount} passed
                    </Badge>
                    {failedCount > 0 && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {failedCount} failed
                      </Badge>
                    )}
                  </>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Workspace Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Workspace Context</label>
              <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder={loadingWorkspaces ? "Loading workspaces..." : "Select a workspace (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>No workspace context</span>
                    </div>
                  </SelectItem>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{workspace.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a workspace to provide context to agent tools during testing
              </p>
            </div>

            {/* Schedule Selector */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a schedule to test" />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                          <span>{schedule.name}</span>
                          <span className="text-muted-foreground">
                            ({schedule.agent?.name || 'Unknown Agent'})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={runSelectedTest}
                disabled={!selectedScheduleId || isTesting || testingAll}
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Run Test
              </Button>
              <Button
                variant="outline"
                onClick={previewNotification}
                disabled={!selectedScheduleId || testingNotification}
                title="Test notification without running agent (no API credits used)"
              >
                {testingNotification ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="mr-2 h-4 w-4" />
                )}
                Test Notification
              </Button>
              <Button
                variant="outline"
                onClick={runAllTests}
                disabled={isTesting || testingAll || schedules.length === 0}
              >
                {testingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Run All
                <Badge variant="secondary" className="ml-2">
                  {schedules.length}
                </Badge>
              </Button>
            </div>

            {/* Cron Validator (show when a schedule is selected) */}
            {selectedSchedule && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <CronValidator
                  initialExpression={selectedSchedule.cron_expression}
                  timezone={selectedSchedule.timezone || 'America/New_York'}
                />
              </div>
            )}

            {/* Test Progress */}
            {testingAll && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing schedule {testResults.length + 1} of {schedules.length}...
              </div>
            )}

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">Test Results</div>
                <div className="divide-y rounded-lg border overflow-hidden">
                  {testResults.map((result) => (
                    <Collapsible
                      key={result.scheduleId}
                      open={expandedResult === result.scheduleId}
                      onOpenChange={(open) =>
                        setExpandedResult(open ? result.scheduleId : null)
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <Bot className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{result.scheduleName}</p>
                              <p className="text-sm text-muted-foreground">{result.agentName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {result.durationMs}ms
                              </span>
                              {result.execution?.tokens_input && (
                                <span className="flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  {result.execution.tokens_input.toLocaleString()} / {result.execution.tokens_output?.toLocaleString() || '0'}
                                </span>
                              )}
                              {result.execution?.cost_usd && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${result.execution.cost_usd.toFixed(4)}
                                </span>
                              )}
                            </div>
                            <Badge variant={result.success ? 'default' : 'destructive'}>
                              {result.success ? (
                                <>
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Pass
                                </>
                              ) : (
                                <>
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Fail
                                </>
                              )}
                            </Badge>
                            {expandedResult === result.scheduleId ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 border-t bg-muted/20">
                          {result.error && !result.execution && (
                            <div className="p-3 bg-destructive/10 rounded-md text-sm text-destructive mt-3">
                              {result.error}
                            </div>
                          )}
                          {result.execution && (
                            <div className="mt-3">
                              <ExecutionDetails
                                execution={result.execution}
                                rawApiResponse={result.rawApiResponse}
                              />
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

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
              Notification Test
            </DialogTitle>
            <DialogDescription>
              {notificationTestResult?.message}
            </DialogDescription>
          </DialogHeader>
          {notificationTestResult?.details && (
            <ScrollArea className="max-h-[400px]">
              <div className="p-3 bg-muted rounded-md text-sm overflow-auto">
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(notificationTestResult.details, null, 2)}
                </pre>
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {Boolean(notificationTestResult?.details?.can_send_notification) && (
              <Button
                onClick={sendTestNotification}
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
    </Collapsible>
  )
}

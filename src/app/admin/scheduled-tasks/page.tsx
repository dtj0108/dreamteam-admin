'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Bot, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AgentScheduleExecution } from '@/types/agents'
import { ExecutionDetails } from '@/components/admin/execution-details'

interface ScheduleExecution extends AgentScheduleExecution {
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

const statusFilters = [
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'all', label: 'All Statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

function getStatusBadge(status: string) {
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
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function ScheduledTasksPage() {
  const [executions, setExecutions] = useState<ScheduleExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending_approval')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingExecution, setRejectingExecution] = useState<ScheduleExecution | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<ScheduleExecution | null>(null)

  const fetchExecutions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('status', statusFilter)

    const res = await fetch(`/api/admin/scheduled-tasks?${params}`)
    const data = await res.json()
    setExecutions(data.executions || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchExecutions()
  }, [fetchExecutions])

  async function handleApprove(execution: ScheduleExecution) {
    setActionLoading(execution.id)
    try {
      const res = await fetch(`/api/admin/scheduled-tasks/${execution.id}/approve`, {
        method: 'POST',
      })
      if (res.ok) {
        fetchExecutions()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to approve execution')
      }
    } catch (error) {
      console.error('Approve error:', error)
      alert('Failed to approve execution')
    } finally {
      setActionLoading(null)
    }
  }

  function openRejectDialog(execution: ScheduleExecution) {
    setRejectingExecution(execution)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  async function handleReject() {
    if (!rejectingExecution) return

    setActionLoading(rejectingExecution.id)
    try {
      const res = await fetch(`/api/admin/scheduled-tasks/${rejectingExecution.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (res.ok) {
        setRejectDialogOpen(false)
        fetchExecutions()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to reject execution')
      }
    } catch (error) {
      console.error('Reject error:', error)
      alert('Failed to reject execution')
    } finally {
      setActionLoading(null)
    }
  }

  function openDetailDialog(execution: ScheduleExecution) {
    setSelectedExecution(execution)
    setDetailDialogOpen(true)
  }

  const pendingCount = executions.filter(e => e.status === 'pending_approval').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Tasks</h1>
          <p className="text-muted-foreground">
            Review and approve scheduled agent executions
            {pendingCount > 0 && statusFilter !== 'pending_approval' && (
              <span className="ml-2 text-yellow-600">({pendingCount} pending)</span>
            )}
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Scheduled For</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : executions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No scheduled tasks</p>
                  <p className="text-sm">
                    {statusFilter === 'pending_approval'
                      ? 'No tasks awaiting approval'
                      : 'No executions match the selected filter'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              executions.map((execution) => (
                <TableRow
                  key={execution.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetailDialog(execution)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {execution.agent?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={execution.agent.avatar_url}
                            alt={execution.agent.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Bot className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{execution.agent?.name || 'Unknown Agent'}</p>
                        <p className="text-xs text-muted-foreground">
                          {execution.schedule?.name || 'Unnamed Schedule'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm line-clamp-2 max-w-xs">
                      {execution.schedule?.task_prompt || 'No task defined'}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(execution.scheduled_for), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(execution.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    {execution.status === 'pending_approval' && (
                      <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRejectDialog(execution)}
                          disabled={actionLoading === execution.id}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(execution)}
                          disabled={actionLoading === execution.id}
                        >
                          {actionLoading === execution.id ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1 h-4 w-4" />
                          )}
                          Approve
                        </Button>
                      </div>
                    )}
                    {execution.status === 'rejected' && execution.rejection_reason && (
                      <span className="text-sm text-muted-foreground">
                        Reason: {execution.rejection_reason}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Scheduled Task</DialogTitle>
            <DialogDescription>
              This will prevent the agent from running this scheduled task.
              You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Agent</Label>
              <p className="text-sm font-medium">{rejectingExecution?.agent?.name}</p>
            </div>
            <div className="space-y-2">
              <Label>Schedule</Label>
              <p className="text-sm">{rejectingExecution?.schedule?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Data not ready yet, needs review first..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading === rejectingExecution?.id}
            >
              {actionLoading === rejectingExecution?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Reject Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execution Details</DialogTitle>
            <DialogDescription>
              {selectedExecution?.schedule?.name} - {selectedExecution?.agent?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedExecution && (
            <ExecutionDetails execution={selectedExecution} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            {selectedExecution?.status === 'pending_approval' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailDialogOpen(false)
                    openRejectDialog(selectedExecution)
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    handleApprove(selectedExecution)
                    setDetailDialogOpen(false)
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve & Run
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

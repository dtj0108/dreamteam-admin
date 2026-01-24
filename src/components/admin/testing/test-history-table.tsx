'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Bot,
  Wrench,
  Calendar,
  Cpu,
  CheckCircle,
  XCircle,
  Clock,
  History
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { TestHistoryEntry, TestType } from '@/types/testing'

interface TestHistoryTableProps {
  entries: TestHistoryEntry[]
  loading?: boolean
  limit?: number
}

const typeConfig: Record<TestType, { icon: typeof Bot; color: string; label: string }> = {
  agent: { icon: Bot, color: 'text-blue-600', label: 'Agent' },
  tool: { icon: Wrench, color: 'text-orange-600', label: 'Tool' },
  schedule: { icon: Calendar, color: 'text-purple-600', label: 'Schedule' },
  provider: { icon: Cpu, color: 'text-green-600', label: 'Provider' }
}

export function TestHistoryTable({ entries, loading, limit = 10 }: TestHistoryTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Test Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayedEntries = entries.slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Recent Test Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayedEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No test activity yet</p>
            <p className="text-sm">Run some tests to see history here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedEntries.map((entry) => {
                const config = typeConfig[entry.type]
                const Icon = config.icon

                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className="text-sm">{config.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{entry.target_name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.success ? 'default' : 'destructive'}
                        className={entry.success
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : ''
                        }
                      >
                        {entry.success ? (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        ) : (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {entry.success ? 'Pass' : 'Fail'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {entry.duration_ms > 0 ? `${entry.duration_ms}ms` : '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

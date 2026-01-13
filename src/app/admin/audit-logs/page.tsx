'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
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
import { format } from 'date-fns'
import { ScrollText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface AuditLog {
  id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
  admin: {
    id: string
    email: string
    name: string | null
  } | null
}

const targetTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'user', label: 'User' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'feature_flag', label: 'Feature Flag' },
  { value: 'api_key', label: 'API Key' },
]

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [targetType, setTargetType] = useState('all')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (targetType !== 'all') params.set('target_type', targetType)

    const res = await fetch(`/api/admin/audit-logs?${params}`)
    const data = await res.json()
    setLogs(data.logs || [])
    setLoading(false)
  }, [targetType])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function formatAction(action: string): string {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  function getActionColor(action: string): 'default' | 'secondary' | 'destructive' {
    if (action.includes('deleted') || action.includes('revoked') || action.includes('suspended')) {
      return 'destructive'
    }
    if (action.includes('created')) {
      return 'default'
    }
    return 'secondary'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Track all admin actions on the platform</p>
        </div>
        <Select value={targetType} onValueChange={setTargetType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {targetTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  <ScrollText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No audit logs found</p>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant={getActionColor(log.action)}>
                      {formatAction(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.admin ? (
                      <div>
                        <p className="text-sm font-medium">{log.admin.name || 'No name'}</p>
                        <p className="text-xs text-muted-foreground">{log.admin.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.target_type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {log.ip_address || 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

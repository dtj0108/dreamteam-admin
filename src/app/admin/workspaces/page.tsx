'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Search, Trash2, Users, Ban, CheckCircle, ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Workspace {
  id: string
  name: string
  slug: string
  is_suspended?: boolean
  created_at: string
  owner: {
    id: string
    email: string
    name: string | null
  } | null
  workspace_members: { count: number }[]
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    workspace: Workspace | null
  }>({ open: false, workspace: null })
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean
    workspace: Workspace | null
  }>({ open: false, workspace: null })
  const [actionLoading, setActionLoading] = useState(false)

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)

    const res = await fetch(`/api/admin/workspaces?${params}`)
    const data = await res.json()
    setWorkspaces(data.workspaces || [])
    setLoading(false)
  }, [search])

  useEffect(() => {
    const timeoutId = setTimeout(fetchWorkspaces, 300)
    return () => clearTimeout(timeoutId)
  }, [fetchWorkspaces])

  async function handleDeleteWorkspace(workspace: Workspace) {
    setActionLoading(true)
    const res = await fetch(`/api/admin/workspaces/${workspace.id}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      fetchWorkspaces()
    }
    setActionLoading(false)
    setDeleteDialog({ open: false, workspace: null })
  }

  async function handleSuspendWorkspace(workspace: Workspace) {
    setActionLoading(true)
    const res = await fetch(`/api/admin/workspaces/${workspace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_suspended: !workspace.is_suspended })
    })

    if (res.ok) {
      fetchWorkspaces()
    }
    setActionLoading(false)
    setSuspendDialog({ open: false, workspace: null })
  }

  function getMemberCount(workspace: Workspace): number {
    return workspace.workspace_members?.[0]?.count || 0
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground">Manage all platform workspaces</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : workspaces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No workspaces found
                </TableCell>
              </TableRow>
            ) : (
              workspaces.map((workspace) => (
                <TableRow key={workspace.id}>
                  <TableCell>
                    <Link
                      href={`/admin/workspaces/${workspace.id}`}
                      className="block hover:underline"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{workspace.name}</p>
                        {workspace.is_suspended && (
                          <Badge variant="destructive" className="text-xs">Suspended</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">/{workspace.slug}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {workspace.owner ? (
                      <div>
                        <p className="text-sm">{workspace.owner.name || 'No name'}</p>
                        <p className="text-xs text-muted-foreground">{workspace.owner.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No owner</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {getMemberCount(workspace)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(workspace.created_at), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/workspaces/${workspace.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSuspendDialog({ open: true, workspace })}
                        >
                          {workspace.is_suspended ? (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Unsuspend
                            </>
                          ) : (
                            <>
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setDeleteDialog({ open: true, workspace })
                          }
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete workspace
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          !open && setDeleteDialog({ open: false, workspace: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.workspace?.name}&quot;?
              This will remove all members and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, workspace: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => {
                if (deleteDialog.workspace) {
                  handleDeleteWorkspace(deleteDialog.workspace)
                }
              }}
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={suspendDialog.open}
        onOpenChange={(open) =>
          !open && setSuspendDialog({ open: false, workspace: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspendDialog.workspace?.is_suspended ? 'Unsuspend' : 'Suspend'} Workspace
            </DialogTitle>
            <DialogDescription>
              {suspendDialog.workspace?.is_suspended
                ? `Are you sure you want to unsuspend "${suspendDialog.workspace?.name}"? Members will regain access.`
                : `Are you sure you want to suspend "${suspendDialog.workspace?.name}"? All members will lose access.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuspendDialog({ open: false, workspace: null })}
            >
              Cancel
            </Button>
            <Button
              variant={suspendDialog.workspace?.is_suspended ? 'default' : 'destructive'}
              disabled={actionLoading}
              onClick={() => {
                if (suspendDialog.workspace) {
                  handleSuspendWorkspace(suspendDialog.workspace)
                }
              }}
            >
              {actionLoading
                ? 'Processing...'
                : suspendDialog.workspace?.is_suspended
                  ? 'Unsuspend'
                  : 'Suspend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

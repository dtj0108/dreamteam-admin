'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Search, Shield, ShieldOff, UserX, UserPlus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  is_superadmin: boolean
  created_at: string
  workspace_members: {
    workspace: { id: string; name: string } | null
    role: string
  }[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'superadmin' | 'suspend' | null
    user: User | null
  }>({ open: false, type: null, user: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSuperadmin, setInviteSuperadmin] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)

    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }, [search])

  useEffect(() => {
    const timeoutId = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [fetchUsers])

  async function handleToggleSuperadmin(user: User) {
    setActionLoading(true)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_superadmin: !user.is_superadmin }),
    })

    if (res.ok) {
      fetchUsers()
    }
    setActionLoading(false)
    setActionDialog({ open: false, type: null, user: null })
  }

  async function handleSuspendUser(user: User) {
    setActionLoading(true)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      fetchUsers()
    }
    setActionLoading(false)
    setActionDialog({ open: false, type: null, user: null })
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  async function handleInviteUser(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError('')
    setInviteSuccess('')

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          is_superadmin: inviteSuperadmin,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setInviteError(data.error || 'Failed to send invitation')
      } else {
        setInviteSuccess(`Invitation sent to ${inviteEmail}`)
        setInviteEmail('')
        setInviteSuperadmin(false)
        fetchUsers()
        setTimeout(() => {
          setInviteDialog(false)
          setInviteSuccess('')
        }, 2000)
      }
    } catch {
      setInviteError('Failed to send invitation')
    }

    setInviteLoading(false)
  }

  function resetInviteDialog() {
    setInviteEmail('')
    setInviteSuperadmin(false)
    setInviteError('')
    setInviteSuccess('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setInviteDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Workspaces</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_superadmin ? (
                      <Badge variant="destructive">Superadmin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.workspace_members?.length || 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(user.created_at), {
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
                        <DropdownMenuItem
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              type: 'superadmin',
                              user,
                            })
                          }
                        >
                          {user.is_superadmin ? (
                            <>
                              <ShieldOff className="mr-2 h-4 w-4" />
                              Remove superadmin
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Make superadmin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              type: 'suspend',
                              user,
                            })
                          }
                          className="text-destructive"
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Suspend user
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
        open={actionDialog.open}
        onOpenChange={(open) =>
          !open && setActionDialog({ open: false, type: null, user: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'superadmin'
                ? actionDialog.user?.is_superadmin
                  ? 'Remove Superadmin'
                  : 'Make Superadmin'
                : 'Suspend User'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'superadmin'
                ? actionDialog.user?.is_superadmin
                  ? `Are you sure you want to remove superadmin privileges from ${actionDialog.user?.email}?`
                  : `Are you sure you want to grant superadmin privileges to ${actionDialog.user?.email}?`
                : `Are you sure you want to suspend ${actionDialog.user?.email}? This will remove them from all workspaces.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({ open: false, type: null, user: null })
              }
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === 'suspend' ? 'destructive' : 'default'}
              disabled={actionLoading}
              onClick={() => {
                if (actionDialog.type === 'superadmin' && actionDialog.user) {
                  handleToggleSuperadmin(actionDialog.user)
                } else if (actionDialog.type === 'suspend' && actionDialog.user) {
                  handleSuspendUser(actionDialog.user)
                }
              }}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inviteDialog}
        onOpenChange={(open) => {
          setInviteDialog(open)
          if (!open) resetInviteDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new user to the platform.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4">
            {inviteError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                {inviteSuccess}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="invite-superadmin"
                checked={inviteSuperadmin}
                onCheckedChange={(checked) => setInviteSuperadmin(checked === true)}
              />
              <Label htmlFor="invite-superadmin" className="text-sm font-normal">
                Grant superadmin privileges
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setInviteDialog(false)
                  resetInviteDialog()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={inviteLoading || !inviteEmail}>
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

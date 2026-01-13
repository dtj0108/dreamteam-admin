'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
import { formatDistanceToNow } from 'date-fns'
import { Key, Ban } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface ApiKey {
  id: string
  name: string
  key_hash: string
  is_revoked: boolean
  last_used_at: string | null
  created_at: string
  workspace: {
    id: string
    name: string
    slug: string
  } | null
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showRevoked, setShowRevoked] = useState(false)
  const [revokeDialog, setRevokeDialog] = useState<{
    open: boolean
    apiKey: ApiKey | null
  }>({ open: false, apiKey: null })
  const [actionLoading, setActionLoading] = useState(false)

  const fetchApiKeys = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (showRevoked) params.set('showRevoked', 'true')

    const res = await fetch(`/api/admin/api-keys?${params}`)
    const data = await res.json()
    setApiKeys(data.apiKeys || [])
    setLoading(false)
  }, [showRevoked])

  useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  async function handleRevoke(apiKey: ApiKey) {
    setActionLoading(true)
    const res = await fetch(`/api/admin/api-keys/${apiKey.id}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      fetchApiKeys()
    }
    setActionLoading(false)
    setRevokeDialog({ open: false, apiKey: null })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage API keys across all workspaces</p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="showRevoked"
            checked={showRevoked}
            onCheckedChange={(checked) => setShowRevoked(checked === true)}
          />
          <Label htmlFor="showRevoked" className="cursor-pointer">
            Show revoked keys
          </Label>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <Key className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No API keys found</p>
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{apiKey.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {apiKey.workspace ? (
                      <span>{apiKey.workspace.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {apiKey.is_revoked ? (
                      <Badge variant="destructive">Revoked</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {apiKey.last_used_at
                      ? formatDistanceToNow(new Date(apiKey.last_used_at), {
                          addSuffix: true,
                        })
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(apiKey.created_at), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    {!apiKey.is_revoked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setRevokeDialog({ open: true, apiKey })
                        }
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={revokeDialog.open}
        onOpenChange={(open) =>
          !open && setRevokeDialog({ open: false, apiKey: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the API key &quot;{revokeDialog.apiKey?.name}&quot;?
              This action cannot be undone and any applications using this key will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeDialog({ open: false, apiKey: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => {
                if (revokeDialog.apiKey) {
                  handleRevoke(revokeDialog.apiKey)
                }
              }}
            >
              {actionLoading ? 'Revoking...' : 'Revoke Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

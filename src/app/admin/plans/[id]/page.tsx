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
  ArrowLeft,
  Save,
  CreditCard,
  Users,
  Loader2,
  Plus,
  Trash2,
  Link as LinkIcon
} from 'lucide-react'
import type { PlanWithTeam, Team } from '@/types/teams'

export default function PlanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Core state
  const [plan, setPlan] = useState<PlanWithTeam | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [teamId, setTeamId] = useState('')
  const [priceMonthly, setPriceMonthly] = useState('')
  const [priceYearly, setPriceYearly] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [features, setFeatures] = useState<string[]>([])
  const [newFeature, setNewFeature] = useState('')
  const [limits, setLimits] = useState<Record<string, number>>({})
  const [newLimitKey, setNewLimitKey] = useState('')
  const [newLimitValue, setNewLimitValue] = useState('')

  // Fetch plan data
  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/plans/${id}`)
      if (!res.ok) throw new Error('Plan not found')

      const data = await res.json()
      const planData = data.plan

      setPlan(planData)
      setName(planData.name)
      setSlug(planData.slug || '')
      setDescription(planData.description || '')
      setTeamId(planData.team_id || '')
      setPriceMonthly(planData.price_monthly !== null ? (planData.price_monthly / 100).toFixed(2) : '')
      setPriceYearly(planData.price_yearly !== null ? (planData.price_yearly / 100).toFixed(2) : '')
      setIsActive(planData.is_active)
      setFeatures(planData.features || [])
      setLimits(planData.limits || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan')
    } finally {
      setLoading(false)
    }
  }, [id])

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    const res = await fetch('/api/admin/teams?active_only=true')
    if (res.ok) {
      const data = await res.json()
      setTeams(data.teams || [])
    }
  }, [])

  useEffect(() => {
    fetchPlan()
    fetchTeams()
  }, [fetchPlan, fetchTeams])

  // Save plan
  async function savePlan() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description: description || null,
          team_id: teamId || null,
          price_monthly: priceMonthly ? Math.round(parseFloat(priceMonthly) * 100) : null,
          price_yearly: priceYearly ? Math.round(parseFloat(priceYearly) * 100) : null,
          is_active: isActive,
          features,
          limits
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      await fetchPlan()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Add feature
  function addFeature() {
    if (!newFeature.trim()) return
    setFeatures(prev => [...prev, newFeature.trim()])
    setNewFeature('')
  }

  // Remove feature
  function removeFeature(index: number) {
    setFeatures(prev => prev.filter((_, i) => i !== index))
  }

  // Add limit
  function addLimit() {
    if (!newLimitKey.trim() || !newLimitValue) return
    setLimits(prev => ({ ...prev, [newLimitKey.trim()]: parseInt(newLimitValue) }))
    setNewLimitKey('')
    setNewLimitValue('')
  }

  // Remove limit
  function removeLimit(key: string) {
    setLimits(prev => {
      const { [key]: _, ...rest } = prev
      return rest
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Plan not found</p>
        <Button variant="link" onClick={() => router.push('/admin/plans')}>
          Back to Plans
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/plans')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{plan.name}</h1>
              {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-muted-foreground">{plan.description || 'No description'}</p>
          </div>
        </div>
        <Button onClick={savePlan} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plan Details
            </CardTitle>
            <CardDescription>Basic information about this plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId || '_none'} onValueChange={(v) => setTeamId(v === '_none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No team</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamId && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => router.push(`/admin/teams/${teamId}`)}
                >
                  <LinkIcon className="h-3 w-3 mr-1" />
                  View Team
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Set the subscription prices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priceMonthly">Monthly Price ($)</Label>
                <Input
                  id="priceMonthly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceMonthly}
                  onChange={e => setPriceMonthly(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceYearly">Yearly Price ($)</Label>
                <Input
                  id="priceYearly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceYearly}
                  onChange={e => setPriceYearly(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            {priceMonthly && priceYearly && (
              <p className="text-sm text-muted-foreground">
                Annual savings: ${((parseFloat(priceMonthly) * 12) - parseFloat(priceYearly)).toFixed(2)}
                ({Math.round((1 - parseFloat(priceYearly) / (parseFloat(priceMonthly) * 12)) * 100)}% off)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>List of features included in this plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                placeholder="Add a feature"
                onKeyDown={e => e.key === 'Enter' && addFeature()}
              />
              <Button onClick={addFeature} disabled={!newFeature.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                  <span className="text-sm">{feature}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {features.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No features added yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Limits</CardTitle>
            <CardDescription>Usage limits for this plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newLimitKey}
                onChange={e => setNewLimitKey(e.target.value)}
                placeholder="Limit name"
                className="flex-1"
              />
              <Input
                type="number"
                value={newLimitValue}
                onChange={e => setNewLimitValue(e.target.value)}
                placeholder="Value"
                className="w-24"
              />
              <Button onClick={addLimit} disabled={!newLimitKey.trim() || !newLimitValue}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {Object.entries(limits).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{key}</Badge>
                    <span className="text-sm">{value}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLimit(key)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {Object.keys(limits).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No limits configured
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Common limits: messages_per_month, agents_count, storage_mb, api_calls_per_day
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

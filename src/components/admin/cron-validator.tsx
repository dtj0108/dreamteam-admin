'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, Loader2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { SCHEDULE_PRESETS } from '@/types/agents'

interface CronValidationResult {
  valid: boolean
  expression?: string
  description?: string
  timezone?: string
  next_runs?: string[]
  error?: string
  hint?: string
  fields?: {
    minute: string
    hour: string
    day_of_month: string
    month: string
    day_of_week: string
  }
}

interface CronValidatorProps {
  initialExpression?: string
  timezone?: string
  onChange?: (expression: string, isValid: boolean) => void
  compact?: boolean
}

export function CronValidator({
  initialExpression = '',
  timezone = 'America/New_York',
  onChange,
  compact = false
}: CronValidatorProps) {
  const [expression, setExpression] = useState(initialExpression)
  const [selectedPreset, setSelectedPreset] = useState<string>('custom')
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<CronValidationResult | null>(null)

  const validate = useCallback(async (cronExpression: string) => {
    if (!cronExpression.trim()) {
      setResult(null)
      return
    }

    setValidating(true)
    try {
      const res = await fetch('/api/admin/cron/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cron_expression: cronExpression,
          timezone,
          count: 5
        })
      })

      const data: CronValidationResult = await res.json()
      setResult(data)
      onChange?.(cronExpression, data.valid)
    } catch (err) {
      setResult({
        valid: false,
        error: 'Failed to validate expression'
      })
      onChange?.(cronExpression, false)
    } finally {
      setValidating(false)
    }
  }, [timezone, onChange])

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)
    const presetData = SCHEDULE_PRESETS.find(p => p.value === preset)
    if (presetData && presetData.cron) {
      setExpression(presetData.cron)
      validate(presetData.cron)
    }
  }

  const handleExpressionChange = (value: string) => {
    setExpression(value)
    setSelectedPreset('custom')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Cron Validator</Label>
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Preset</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Timezone</Label>
            <Input
              className="mt-1"
              value={timezone}
              disabled
              placeholder="America/New_York"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={expression}
          onChange={(e) => handleExpressionChange(e.target.value)}
          placeholder="0 9 * * 1"
          className="font-mono text-sm"
        />
        <Button
          variant="outline"
          onClick={() => validate(expression)}
          disabled={validating || !expression.trim()}
        >
          {validating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Validate'
          )}
        </Button>
      </div>

      {!compact && (
        <div className="text-xs text-muted-foreground">
          Format: minute hour day-of-month month day-of-week
        </div>
      )}

      {result && (
        <div className={`rounded-md p-3 ${result.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2">
            {result.valid ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={`font-medium text-sm ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
              {result.valid ? 'Valid' : 'Invalid'}
            </span>
            {result.description && (
              <span className="text-sm text-muted-foreground">- {result.description}</span>
            )}
          </div>

          {result.error && (
            <p className="mt-2 text-sm text-red-600">{result.error}</p>
          )}

          {result.hint && (
            <p className="mt-1 text-xs text-muted-foreground">{result.hint}</p>
          )}

          {result.valid && result.fields && !compact && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs font-mono">
                min: {result.fields.minute}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                hr: {result.fields.hour}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                dom: {result.fields.day_of_month}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                mon: {result.fields.month}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                dow: {result.fields.day_of_week}
              </Badge>
            </div>
          )}

          {result.valid && result.next_runs && result.next_runs.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Calendar className="h-3 w-3" />
                Next {result.next_runs.length} runs:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.next_runs.map((run, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {format(new Date(run), 'MMM d, HH:mm')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

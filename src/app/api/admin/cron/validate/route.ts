import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { CronExpressionParser } from 'cron-parser'

// Cron expression field descriptions for human-readable output
const CRON_FIELD_NAMES = ['minute', 'hour', 'day of month', 'month', 'day of week']

function describeCronExpression(expression: string): string {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) {
    return 'Invalid cron expression'
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // Common patterns
  if (expression === '* * * * *') return 'Every minute'
  if (expression === '0 * * * *') return 'Every hour at minute 0'
  if (expression === '0 0 * * *') return 'Every day at midnight'
  if (expression === '0 9 * * *') return 'Every day at 9:00 AM'
  if (expression === '0 9 * * 1') return 'Every Monday at 9:00 AM'
  if (expression === '0 9 * * 1-5') return 'Every weekday at 9:00 AM'
  if (expression === '0 9 1 * *') return 'First day of every month at 9:00 AM'
  if (expression === '0 0 1 1 *') return 'January 1st at midnight (yearly)'

  // Build description from parts
  const descriptions: string[] = []

  // Time description
  if (minute !== '*' && hour !== '*') {
    const h = parseInt(hour)
    const m = parseInt(minute)
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    descriptions.push(`at ${displayHour}:${m.toString().padStart(2, '0')} ${period}`)
  } else if (hour !== '*') {
    const h = parseInt(hour)
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    descriptions.push(`every minute from ${displayHour} ${period}`)
  }

  // Day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  if (dayOfWeek !== '*') {
    if (dayOfWeek === '1-5') {
      descriptions.unshift('Every weekday')
    } else if (dayOfWeek === '0,6') {
      descriptions.unshift('Every weekend')
    } else if (/^\d$/.test(dayOfWeek)) {
      descriptions.unshift(`Every ${dayNames[parseInt(dayOfWeek)]}`)
    } else {
      descriptions.unshift(`On days ${dayOfWeek}`)
    }
  }

  // Day of month
  if (dayOfMonth !== '*' && dayOfWeek === '*') {
    if (dayOfMonth === '1') {
      descriptions.unshift('First day of every month')
    } else if (dayOfMonth === 'L') {
      descriptions.unshift('Last day of every month')
    } else {
      descriptions.unshift(`Day ${dayOfMonth} of every month`)
    }
  }

  // Month
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
  if (month !== '*') {
    if (/^\d+$/.test(month)) {
      descriptions.push(`in ${monthNames[parseInt(month)]}`)
    } else {
      descriptions.push(`in months ${month}`)
    }
  }

  if (descriptions.length === 0) {
    return 'Custom schedule'
  }

  return descriptions.join(' ')
}

// POST /api/admin/cron/validate - Validate cron expression and get next runs
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const body = await request.json()
    const { cron_expression, timezone = 'America/New_York', count = 5 } = body

    if (!cron_expression || typeof cron_expression !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Cron expression is required' },
        { status: 400 }
      )
    }

    const expression = cron_expression.trim()

    // Validate the cron expression
    try {
      // CronExpressionParser v5 expects 6 fields (with seconds)
      // If 5 fields provided, prepend '0' for seconds
      const parts = expression.split(/\s+/)
      const fullExpression = parts.length === 5 ? `0 ${expression}` : expression

      const cronExpression = CronExpressionParser.parse(fullExpression, {
        currentDate: new Date()
      })

      // Get next N run times
      const nextRuns: string[] = []
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (cronExpression.hasNext()) {
          const next = cronExpression.next()
          const isoString = next?.toISOString()
          if (isoString) {
            nextRuns.push(isoString)
          }
        }
      }

      // Generate human-readable description
      const description = describeCronExpression(expression)

      return NextResponse.json({
        valid: true,
        expression,
        description,
        timezone,
        next_runs: nextRuns,
        fields: {
          minute: parts.length === 5 ? parts[0] : parts[1],
          hour: parts.length === 5 ? parts[1] : parts[2],
          day_of_month: parts.length === 5 ? parts[2] : parts[3],
          month: parts.length === 5 ? parts[3] : parts[4],
          day_of_week: parts.length === 5 ? parts[4] : parts[5]
        }
      })
    } catch (parseError) {
      return NextResponse.json({
        valid: false,
        expression,
        error: parseError instanceof Error ? parseError.message : 'Invalid cron expression',
        hint: `Cron format: ${CRON_FIELD_NAMES.join(' ')}`
      })
    }
  } catch (err) {
    console.error('Cron validation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Cron expression utilities for schedule management
 */

/**
 * Parse a cron expression and calculate the next run time
 * Cron format: minute hour day-of-month month day-of-week
 *
 * Examples:
 * - "0 9 * * *" = Daily at 9:00 AM
 * - "0 9 * * 1" = Every Monday at 9:00 AM
 * - "0 9 1 * *" = 1st of each month at 9:00 AM
 * - "0 9 1 1,4,7,10 *" = Quarterly (Jan, Apr, Jul, Oct 1st) at 9:00 AM
 */
export function getNextRunTime(cronExpression: string, timezone: string = 'UTC', after: Date = new Date()): Date {
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: ${cronExpression}`)
  }

  const [minutePart, hourPart, dayPart, monthPart, weekdayPart] = parts

  // Parse each part into allowed values
  const minutes = parseCronPart(minutePart, 0, 59)
  const hours = parseCronPart(hourPart, 0, 23)
  const days = parseCronPart(dayPart, 1, 31)
  const months = parseCronPart(monthPart, 1, 12)
  const weekdays = parseCronPart(weekdayPart, 0, 6) // 0 = Sunday

  // Start from the minute after 'after'
  const current = new Date(after)
  current.setSeconds(0, 0)
  current.setMinutes(current.getMinutes() + 1)

  // Search for next valid time (up to 2 years ahead)
  const maxIterations = 525600 // minutes in a year * 2
  for (let i = 0; i < maxIterations; i++) {
    const month = current.getMonth() + 1 // JS months are 0-indexed
    const day = current.getDate()
    const hour = current.getHours()
    const minute = current.getMinutes()
    const weekday = current.getDay()

    // Check if current time matches cron expression
    if (
      months.includes(month) &&
      days.includes(day) &&
      hours.includes(hour) &&
      minutes.includes(minute) &&
      (weekdays.length === 7 || weekdays.includes(weekday)) // weekday only matters if specified
    ) {
      return current
    }

    // Move to next minute
    current.setMinutes(current.getMinutes() + 1)
  }

  // Fallback: return 1 hour from now if no match found
  const fallback = new Date(after)
  fallback.setHours(fallback.getHours() + 1)
  return fallback
}

/**
 * Parse a single cron part into an array of allowed values
 */
function parseCronPart(part: string, min: number, max: number): number[] {
  const values: number[] = []

  // Handle wildcard
  if (part === '*') {
    for (let i = min; i <= max; i++) {
      values.push(i)
    }
    return values
  }

  // Handle comma-separated values
  const segments = part.split(',')
  for (const segment of segments) {
    // Handle range (e.g., "1-5")
    if (segment.includes('-')) {
      const [start, end] = segment.split('-').map(Number)
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) {
          values.push(i)
        }
      }
    }
    // Handle step (e.g., "*/5")
    else if (segment.includes('/')) {
      const [range, step] = segment.split('/')
      const stepNum = parseInt(step, 10)
      const startNum = range === '*' ? min : parseInt(range, 10)
      for (let i = startNum; i <= max; i += stepNum) {
        values.push(i)
      }
    }
    // Handle single value
    else {
      const num = parseInt(segment, 10)
      if (num >= min && num <= max) {
        values.push(num)
      }
    }
  }

  return values.length > 0 ? values : [min]
}

/**
 * Get a human-readable description of a cron expression
 */
export function describeCron(cronExpression: string): string {
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 5) {
    return 'Invalid cron expression'
  }

  const [minute, hour, day, month, weekday] = parts

  // Common patterns
  if (minute === '0' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
    return `Daily at ${formatHour(parseInt(hour, 10))}`
  }

  if (minute === '0' && hour !== '*' && day === '*' && month === '*' && weekday !== '*') {
    const days = weekday.split(',').map(d => getWeekdayName(parseInt(d, 10))).join(', ')
    return `Every ${days} at ${formatHour(parseInt(hour, 10))}`
  }

  if (minute === '0' && hour !== '*' && day !== '*' && month === '*' && weekday === '*') {
    return `Monthly on day ${day} at ${formatHour(parseInt(hour, 10))}`
  }

  if (minute === '0' && hour !== '*' && day !== '*' && month !== '*' && weekday === '*') {
    const months = month.split(',').map(m => getMonthName(parseInt(m, 10))).join(', ')
    return `On ${months} ${day} at ${formatHour(parseInt(hour, 10))}`
  }

  return cronExpression
}

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM'
  if (hour === 12) return '12:00 PM'
  if (hour < 12) return `${hour}:00 AM`
  return `${hour - 12}:00 PM`
}

function getWeekdayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[day] || 'Unknown'
}

function getMonthName(month: number): string {
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[month] || 'Unknown'
}

/**
 * Validate a cron expression
 */
export function isValidCron(cronExpression: string): boolean {
  try {
    const parts = cronExpression.trim().split(/\s+/)
    if (parts.length !== 5) return false

    // Try to parse - will throw if invalid
    getNextRunTime(cronExpression)
    return true
  } catch {
    return false
  }
}

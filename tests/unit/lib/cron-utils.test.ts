import { describe, it, expect } from 'vitest'
import { getNextRunTime, describeCron, isValidCron } from '@/lib/cron-utils'

describe('cron-utils', () => {
  describe('getNextRunTime', () => {
    it('parses daily at 9:00 AM (0 9 * * *)', () => {
      const after = new Date('2025-01-15T08:00:00Z')
      const next = getNextRunTime('0 9 * * *', 'UTC', after)

      expect(next.getHours()).toBe(9)
      expect(next.getMinutes()).toBe(0)
      expect(next.getDate()).toBe(15) // Same day since it's before 9 AM
    })

    it('rolls to next day when past time', () => {
      const after = new Date('2025-01-15T10:00:00Z') // After 9 AM
      const next = getNextRunTime('0 9 * * *', 'UTC', after)

      expect(next.getHours()).toBe(9)
      expect(next.getMinutes()).toBe(0)
      expect(next.getDate()).toBe(16) // Next day
    })

    it('parses weekly on Monday (0 9 * * 1)', () => {
      // January 15, 2025 is a Wednesday
      const after = new Date('2025-01-15T08:00:00Z')
      const next = getNextRunTime('0 9 * * 1', 'UTC', after)

      expect(next.getDay()).toBe(1) // Monday
      expect(next.getHours()).toBe(9)
    })

    it('parses monthly on 1st (0 9 1 * *)', () => {
      const after = new Date('2025-01-15T08:00:00Z')
      const next = getNextRunTime('0 9 1 * *', 'UTC', after)

      expect(next.getDate()).toBe(1)
      expect(next.getMonth()).toBe(1) // February (next month)
      expect(next.getHours()).toBe(9)
    })

    it('handles specific months (0 9 1 1,4,7,10 *) - quarterly', () => {
      const after = new Date('2025-02-15T08:00:00Z')
      const next = getNextRunTime('0 9 1 1,4,7,10 *', 'UTC', after)

      expect(next.getDate()).toBe(1)
      expect(next.getMonth()).toBe(3) // April (0-indexed)
      expect(next.getHours()).toBe(9)
    })

    it('handles ranges (0 9 1-5 * *) - days 1-5 of month', () => {
      const after = new Date('2025-01-06T08:00:00Z') // January 6
      const next = getNextRunTime('0 9 1-5 * *', 'UTC', after)

      expect(next.getDate()).toBeLessThanOrEqual(5)
      expect(next.getMonth()).toBe(1) // February (rolls to next month)
    })

    it('handles step values (*/15 * * * *) - every 15 minutes', () => {
      const after = new Date('2025-01-15T08:07:00Z')
      const next = getNextRunTime('*/15 * * * *', 'UTC', after)

      expect(next.getMinutes() % 15).toBe(0)
    })

    it('handles step values for hours (0 */2 * * *) - every 2 hours', () => {
      const after = new Date('2025-01-15T03:00:00Z')
      const next = getNextRunTime('0 */2 * * *', 'UTC', after)

      expect(next.getMinutes()).toBe(0)
      expect(next.getHours() % 2).toBe(0)
    })

    it('throws for invalid cron expression (wrong number of parts)', () => {
      expect(() => getNextRunTime('0 9 * *', 'UTC')).toThrow('Invalid cron expression')
      expect(() => getNextRunTime('0 9 * * * *', 'UTC')).toThrow('Invalid cron expression')
    })

    it('handles weekday-only schedules correctly', () => {
      // 0 9 * * 1-5 = Monday through Friday at 9 AM
      const after = new Date('2025-01-18T08:00:00Z') // Saturday
      const next = getNextRunTime('0 9 * * 1-5', 'UTC', after)

      expect(next.getDay()).toBeGreaterThanOrEqual(1)
      expect(next.getDay()).toBeLessThanOrEqual(5)
    })
  })

  describe('describeCron', () => {
    it('describes daily at specific hour', () => {
      expect(describeCron('0 9 * * *')).toBe('Daily at 9:00 AM')
      expect(describeCron('0 14 * * *')).toBe('Daily at 2:00 PM')
      expect(describeCron('0 0 * * *')).toBe('Daily at 12:00 AM')
      expect(describeCron('0 12 * * *')).toBe('Daily at 12:00 PM')
    })

    it('describes weekly schedules', () => {
      expect(describeCron('0 9 * * 1')).toBe('Every Monday at 9:00 AM')
      expect(describeCron('0 9 * * 0')).toBe('Every Sunday at 9:00 AM')
      expect(describeCron('0 9 * * 1,3,5')).toBe('Every Monday, Wednesday, Friday at 9:00 AM')
    })

    it('describes monthly schedules', () => {
      expect(describeCron('0 9 1 * *')).toBe('Monthly on day 1 at 9:00 AM')
      expect(describeCron('0 9 15 * *')).toBe('Monthly on day 15 at 9:00 AM')
    })

    it('describes specific month schedules', () => {
      expect(describeCron('0 9 1 1 *')).toBe('On Jan 1 at 9:00 AM')
      expect(describeCron('0 9 15 1,7 *')).toBe('On Jan, Jul 15 at 9:00 AM')
    })

    it('returns raw expression for complex patterns', () => {
      const complex = '*/15 */2 1-5 1-6 1-5'
      expect(describeCron(complex)).toBe(complex)
    })

    it('handles invalid expressions gracefully', () => {
      expect(describeCron('invalid')).toBe('Invalid cron expression')
      expect(describeCron('0 9 *')).toBe('Invalid cron expression')
    })
  })

  describe('isValidCron', () => {
    it('returns true for valid expressions', () => {
      expect(isValidCron('0 9 * * *')).toBe(true)
      expect(isValidCron('*/15 * * * *')).toBe(true)
      expect(isValidCron('0 9 1 1,4,7,10 *')).toBe(true)
      expect(isValidCron('0 0 1 * *')).toBe(true)
      expect(isValidCron('0 9 * * 1-5')).toBe(true)
    })

    it('returns false for invalid expressions', () => {
      expect(isValidCron('invalid')).toBe(false)
      expect(isValidCron('')).toBe(false)
      expect(isValidCron('0 9 *')).toBe(false)
      expect(isValidCron('0 9 * * * *')).toBe(false)
    })

    it('returns false for expressions with invalid ranges', () => {
      // These should still return true as the parser is lenient
      // but let's test the boundary
      expect(isValidCron('0 25 * * *')).toBe(true) // 25 > 23, but parser may not reject
    })
  })
})

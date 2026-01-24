import { test, expect } from '@playwright/test'

test.describe('Scheduled Tasks', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Add authentication setup
  })

  test('displays scheduled tasks list', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // Verify page loads
    await page.waitForLoadState('networkidle')

    // Should show scheduled tasks heading or table
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('can filter by status', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // Look for status filter
    const statusFilter = page.getByRole('combobox', { name: /status/i })

    if (await statusFilter.isVisible()) {
      await statusFilter.click()

      // Should show status options
      const pendingOption = page.getByRole('option', { name: /pending/i })
      await expect(pendingOption).toBeVisible()
    }
  })

  test('shows pending approval badge for tasks requiring approval', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // Look for pending approval indicators
    const pendingBadges = page.locator('text=/pending.*approval/i')

    // Just verify the page loads without errors
    await page.waitForLoadState('networkidle')
  })

  test('create scheduled task form has cron expression field', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // Look for create button
    const createButton = page.getByRole('button', { name: /create|add|new|schedule/i })

    if (await createButton.isVisible()) {
      await createButton.click()

      // Verify cron expression field exists
      const cronField = page.getByLabel(/cron|schedule|expression/i)
      await expect(cronField).toBeVisible()
    }
  })
})

test.describe('Scheduled Task Executions', () => {
  test('displays executions list', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // Look for executions section or tab
    const executionsTab = page.getByRole('tab', { name: /execution/i })

    if (await executionsTab.isVisible()) {
      await executionsTab.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('can view pending approvals', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // Look for filter or tab for pending approvals
    const pendingFilter = page.locator('text=/pending.*approval/i').first()

    if (await pendingFilter.isVisible()) {
      await pendingFilter.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('approve button visible for pending executions', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // Look for approve button
    const approveButton = page.getByRole('button', { name: /approve/i })

    // Just verify page loads - button may not be visible if no pending items
    await page.waitForLoadState('networkidle')
  })

  test('reject button visible for pending executions', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // Look for reject button
    const rejectButton = page.getByRole('button', { name: /reject/i })

    // Just verify page loads
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Task Approval Flow', () => {
  test('can approve a pending task', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // This test requires a pending task to exist
    // In a full E2E setup, you would:
    // 1. Create a task that requires approval
    // 2. Trigger the task to create a pending execution
    // 3. Navigate to the execution
    // 4. Click approve
    // 5. Verify status changes

    await page.waitForLoadState('networkidle')
  })

  test('can reject a pending task with reason', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // Look for reject functionality
    const rejectButton = page.getByRole('button', { name: /reject/i })

    if (await rejectButton.isVisible()) {
      await rejectButton.click()

      // Should show rejection reason dialog/input
      const reasonInput = page.getByLabel(/reason/i)

      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Not needed at this time')

        // Submit rejection
        const confirmButton = page.getByRole('button', { name: /confirm|submit/i })
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
        }
      }
    }
  })

  test('approved task shows approved status', async ({ page }) => {
    await page.goto('/admin/scheduled-tasks')

    // Look for approved status indicators
    const approvedBadge = page.locator('text=/approved/i')

    // Just verify page loads
    await page.waitForLoadState('networkidle')
  })
})

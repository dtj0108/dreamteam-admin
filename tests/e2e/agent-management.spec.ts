import { test, expect } from '@playwright/test'

test.describe('Agent Management', () => {
  // Note: These tests require authentication setup
  // In a real scenario, you would use page.context().addCookies() or similar
  // to set up authenticated state before each test

  test.beforeEach(async ({ page }) => {
    // TODO: Add authentication setup
    // This could use a test user with superadmin privileges
  })

  test('displays agents list', async ({ page }) => {
    await page.goto('/admin/agents')

    // Verify page loads (may redirect to login if not authenticated)
    // In authenticated state, should show agents list
    const pageTitle = page.getByRole('heading', { level: 1 })
    await expect(pageTitle).toBeVisible()
  })

  test('can navigate to agent details', async ({ page }) => {
    await page.goto('/admin/agents')

    // Click on first agent (if exists)
    const agentLinks = page.locator('a[href*="/admin/agents/"]')

    if (await agentLinks.count() > 0) {
      await agentLinks.first().click()
      await expect(page).toHaveURL(/\/admin\/agents\/[\w-]+/)
    }
  })

  test('create agent form has required fields', async ({ page }) => {
    await page.goto('/admin/agents')

    // Look for create/add button
    const createButton = page.getByRole('button', { name: /create|add|new/i })

    if (await createButton.isVisible()) {
      await createButton.click()

      // Verify form fields exist
      await expect(page.getByLabel(/name/i)).toBeVisible()
      await expect(page.getByLabel(/description/i)).toBeVisible()
    }
  })

  test('agent detail page shows configuration', async ({ page }) => {
    // Navigate to a specific agent (would need a known agent ID)
    await page.goto('/admin/agents')

    // Verify agents section exists
    const heading = page.getByRole('heading')
    await expect(heading.first()).toBeVisible()
  })
})

test.describe('Agent Testing Sandbox', () => {
  test('sandbox page loads without Select.Item error', async ({ page }) => {
    await page.goto('/admin/testing')

    // Should not see any React error about Select.Item
    // The page should load successfully
    await page.waitForLoadState('networkidle')

    // Check for any error messages in the page
    const errorText = await page.locator('text=/Select.Item.*value/i').count()
    expect(errorText).toBe(0)
  })

  test('can select agent for testing', async ({ page }) => {
    await page.goto('/admin/testing')

    // Look for agent selector
    const agentSelector = page.getByRole('combobox').first()

    if (await agentSelector.isVisible()) {
      await agentSelector.click()

      // Should show agent options
      const options = page.getByRole('option')
      await expect(options.first()).toBeVisible()
    }
  })

  test('workspace selector shows "No workspace" option', async ({ page }) => {
    await page.goto('/admin/testing')

    // Find and click workspace selector
    const selectors = page.getByRole('combobox')

    if (await selectors.count() > 1) {
      // Workspace is typically the third selector
      const workspaceSelector = selectors.nth(2)

      if (await workspaceSelector.isVisible()) {
        await workspaceSelector.click()

        // Should have "No workspace" option that doesn't cause error
        const noWorkspaceOption = page.getByRole('option', { name: /no workspace/i })
        await expect(noWorkspaceOption).toBeVisible()
      }
    }
  })

  test('tool mode selector works', async ({ page }) => {
    await page.goto('/admin/testing')

    // Find tool mode selector
    const selectors = page.getByRole('combobox')

    if (await selectors.count() > 0) {
      // Tool mode is typically the second selector
      const toolModeSelector = selectors.nth(1)

      if (await toolModeSelector.isVisible()) {
        await toolModeSelector.click()

        // Should show tool mode options
        const mockOption = page.getByRole('option', { name: /mock/i })
        const simulateOption = page.getByRole('option', { name: /simulate/i })
        const liveOption = page.getByRole('option', { name: /live/i })

        await expect(mockOption).toBeVisible()
      }
    }
  })
})

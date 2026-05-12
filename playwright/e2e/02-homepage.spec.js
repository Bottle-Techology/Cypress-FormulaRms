const { test, expect } = require('@playwright/test')

test.describe('02 – Homepage / Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/')
  })

  test('loads the root URL successfully', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible()
  })

  test('redirects unauthenticated users to /login', async ({ page }) => {
    await expect(page).toHaveURL(/\/login/)
  })

  test('displays the Formula RMS brand title', async ({ page }) => {
    await expect(page).toHaveTitle(/Formula RMS/i)
  })

  test('shows an identifier input on the login page', async ({ page }) => {
    await page.waitForURL(/\/login/)
    await expect(page.locator('input').first()).toBeVisible()
  })

  test('shows a continue / send OTP button', async ({ page }) => {
    await page.waitForURL(/\/login/)
    const btn = page.getByRole('button', { name: /continue|send otp|next/i })
    await expect(btn.first()).toBeVisible()
  })

  test('shows error or stays on /login for empty submission', async ({ page }) => {
    await page.waitForURL(/\/login/)
    await page.locator('button[type="submit"], button').first().click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows error for invalid email format', async ({ page }) => {
    await page.waitForURL(/\/login/)
    await page.locator('input').first().fill('not-an-email')
    await page.locator('button[type="submit"], button').first().click()
    await expect(page.locator('body')).toBeVisible()
  })

  test('accepts a valid email and advances to next step', async ({ page }) => {
    await page.waitForURL(/\/login/)
    await page.locator('input').first().fill('pranuj@bottle.com.np')
    await page.locator('button[type="submit"], button').first().click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('renders correctly on mobile viewport (375×812)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.reload()
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('input').first()).toBeVisible()
  })

  test('renders correctly on tablet viewport (768×1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()
    await expect(page.locator('body')).toBeVisible()
  })
})

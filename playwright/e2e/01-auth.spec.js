const { test, expect } = require('@playwright/test')
const { sendOtp, verifyOtp, loginPage, apiRequest, AUTH_BASE, IDENTIFIER } = require('../support/auth')

const OTP_CODE = process.env.OTP_CODE

test.describe('01 – Authentication', () => {
  test.describe('Login page UI', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies()
      await page.goto('/login')
    })

    test('displays the login page', async ({ page }) => {
      await expect(page).toHaveURL(/\/login/)
      await expect(page.locator('body')).toBeVisible()
    })

    test('has an identifier input field', async ({ page }) => {
      await expect(page.locator('input').first()).toBeVisible()
    })

    test('has a submit/continue button', async ({ page }) => {
      await expect(page.locator('button').first()).toBeVisible()
    })

    test('does not submit with an empty identifier', async ({ page }) => {
      await page.locator('button[type="submit"], button').first().click()
      await expect(page).not.toHaveURL(/\/(overview|dashboard)/)
    })
  })

  test.describe('Send OTP – API', () => {
    test('POST /auth/login/send-otp/ returns 200 for a valid identifier', async ({ request }) => {
      test.skip(!!OTP_CODE, 'Skipped when OTP_CODE is already set — re-sending would invalidate it')
      const { status } = await sendOtp(request)
      expect(status).toBe(200)
    })

    test('POST /auth/login/send-otp/ returns error for unknown identifier', async ({ request }) => {
      const res = await request.post(`${AUTH_BASE}/auth/login/send-otp/`, {
        data: { identifier: 'notexist@example.com', method: 'email' },
      })
      expect([400, 401, 404]).toContain(res.status())
    })
  })

  test.describe('Verify OTP – API', () => {
    test.beforeAll(() => {
      test.skip(!OTP_CODE, 'Skipped — OTP_CODE env var not set')
    })

    test('POST /auth/login/verify-otp/ returns access + refresh tokens', async ({ request }) => {
      const result = await verifyOtp(request, OTP_CODE)
      expect(result.status).toBe(200)
      expect(typeof result.access).toBe('string')
      expect(result.access.length).toBeGreaterThan(20)
      expect(typeof result.refresh).toBe('string')
    })
  })

  test.describe('Authenticated session', () => {
    test.beforeAll(() => {
      test.skip(!OTP_CODE, 'Skipped — OTP_CODE env var not set')
    })

    test('injected token keeps user on /overview', async ({ page, request }) => {
      const result = await verifyOtp(request, OTP_CODE)
      await loginPage(page, result.access)
      await expect(page).not.toHaveURL(/\/login/)
    })

    test('clearing storage logs user out', async ({ page, request }) => {
      const result = await verifyOtp(request, OTP_CODE)
      await loginPage(page, result.access)
      await page.evaluate(() => localStorage.clear())
      await page.goto('/overview')
      await expect(page).toHaveURL(/\/login/)
    })
  })
})

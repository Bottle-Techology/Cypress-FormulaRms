const { test, expect } = require('@playwright/test')
const { verifyOtp, loginPage, apiRequest, getCachedToken } = require('../support/auth')

const OTP_CODE = process.env.OTP_CODE

test.describe('03 – Dashboard / Overview', () => {
  test.describe('Dashboard – unauthenticated', () => {
    test('redirects to /login when not authenticated', async ({ page }) => {
      await page.context().clearCookies()
      await page.goto('/overview')
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Dashboard – UI', () => {
    let token

    test.beforeAll(async ({ request }) => {
      test.skip(!OTP_CODE, 'Skipped — OTP_CODE env var not set')
      const result = await verifyOtp(request, OTP_CODE)
      token = result.access
    })

    test.beforeEach(async ({ page }) => {
      await loginPage(page, token)
    })

    test('loads without redirecting to /login', async ({ page }) => {
      await expect(page).not.toHaveURL(/\/login/)
      await expect(page.locator('body')).toBeVisible()
    })

    test('displays a heading or brand title', async ({ page }) => {
      await expect(page.getByText(/overview|dashboard|welcome|formula rms/i).first()).toBeVisible()
    })

    test('shows key metric cards or stat widgets', async ({ page }) => {
      await expect(page.getByText(/order|revenue|table|sale/i).first()).toBeVisible()
    })

    test('has navigation sidebar', async ({ page }) => {
      await expect(page.locator('nav, aside, [class*="sidebar"], [class*="nav"]').first()).toBeVisible()
    })

    test('renders without JS errors', async ({ page }) => {
      const errors = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.reload()
      const critical = errors.filter(
        (e) => !/ResizeObserver|ChunkLoad|NetworkError/i.test(e)
      )
      expect(critical).toHaveLength(0)
    })
  })

  test.describe('Dashboard – API data', () => {
    let token

    test.beforeAll(async ({ request }) => {
      test.skip(!OTP_CODE, 'Skipped — OTP_CODE env var not set')
      const result = await verifyOtp(request, OTP_CODE)
      token = result.access
    })

    test('GET /orders/?status=pending returns 200 with array', async ({ request }) => {
      const { status, body } = await apiRequest(request, 'GET', '/orders/?status=pending')
      expect(status).toBe(200)
      const list = Array.isArray(body) ? body : body.results || []
      expect(Array.isArray(list)).toBe(true)
    })

    test('GET /tables/ returns 200', async ({ request }) => {
      const { status } = await apiRequest(request, 'GET', '/tables/')
      expect(status).toBe(200)
    })

    test('GET /menu/menus/ returns 200', async ({ request }) => {
      const { status } = await apiRequest(request, 'GET', '/menu/menus/')
      expect(status).toBe(200)
    })
  })

  test.describe('Dashboard – navigation', () => {
    let token

    test.beforeAll(async ({ request }) => {
      test.skip(!OTP_CODE, 'Skipped — OTP_CODE env var not set')
      const result = await verifyOtp(request, OTP_CODE)
      token = result.access
    })

    for (const { label, path } of [
      { label: 'menu',     path: '/menu'     },
      { label: 'orders',   path: '/orders'   },
      { label: 'tables',   path: '/tables'   },
      { label: 'settings', path: '/settings' },
    ]) {
      test(`navigating to ${label} stays authenticated`, async ({ page }) => {
        await loginPage(page, token)
        await page.goto(path)
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).toBeVisible()
      })
    }
  })
})

const { test, expect } = require('@playwright/test')
const { verifyOtp, loginPage } = require('../support/auth')

const OTP_CODE = process.env.OTP_CODE

const VIEWPORTS = [
  { label: 'Mobile  375×812',  width: 375,  height: 812  },
  { label: 'Tablet  768×1024', width: 768,  height: 1024 },
  { label: 'Laptop  1280×800', width: 1280, height: 800  },
  { label: 'Desktop 1920×1080',width: 1920, height: 1080 },
]

test.describe('05 – Responsive Design', () => {
  test.describe('Login page (public)', () => {
    for (const { label, width, height } of VIEWPORTS) {
      test(`renders on ${label}`, async ({ page }) => {
        await page.setViewportSize({ width, height })
        await page.context().clearCookies()
        await page.goto('/login')
        await expect(page.locator('body')).toBeVisible()
        await expect(page.locator('input').first()).toBeVisible()
        await expect(page.locator('button').first()).toBeVisible()
      })
    }

    test('no horizontal overflow on mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.context().clearCookies()
      await page.goto('/login')
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(scrollWidth).toBeLessThanOrEqual(375)
    })
  })

  test.describe('Authenticated pages', () => {
    let token

    test.beforeAll(async ({ request }) => {
      test.skip(!OTP_CODE, 'Skipped — OTP_CODE env var not set')
      const result = await verifyOtp(request, OTP_CODE)
      token = result.access
    })

    const pages = [
      { label: 'Overview',  path: '/overview'  },
      { label: 'Menu',      path: '/menu'      },
      { label: 'Orders',    path: '/orders'    },
      { label: 'Tables',    path: '/tables'    },
      { label: 'Settings',  path: '/settings'  },
    ]

    for (const { label: pageName, path } of pages) {
      for (const { label: vpLabel, width, height } of VIEWPORTS) {
        test(`${pageName} renders on ${vpLabel}`, async ({ page }) => {
          await page.setViewportSize({ width, height })
          await loginPage(page, token)
          await page.goto(path)
          await expect(page.locator('body')).toBeVisible()
          await expect(page).not.toHaveURL(/\/login/)
        })
      }
    }

    test('no horizontal overflow on mobile – overview page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await loginPage(page, token)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(scrollWidth).toBeLessThanOrEqual(375 + 15)
    })
  })
})

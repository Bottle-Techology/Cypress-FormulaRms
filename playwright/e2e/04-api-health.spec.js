const { test, expect } = require('@playwright/test')
const { verifyOtp, apiRequest, AUTH_BASE } = require('../support/auth')

const OTP_CODE = process.env.OTP_CODE

test.describe('04 – API Health', () => {
  test.describe('Public endpoints', () => {
    test('POST /auth/login/send-otp/ is reachable', async ({ request }) => {
      const res = await request.post(`${AUTH_BASE}/auth/login/send-otp/`, {
        data: { identifier: 'nonexistent@example.com', method: 'email' },
      })
      // Any defined status (not 0 or network error) means the endpoint exists
      expect(res.status()).toBeGreaterThan(0)
      expect(res.status()).not.toBe(500)
    })

    test('POST /auth/login/verify-otp/ is reachable', async ({ request }) => {
      const res = await request.post(`${AUTH_BASE}/auth/login/verify-otp/`, {
        data: { identifier: 'nonexistent@example.com', method: 'email', code: '000000' },
      })
      expect([400, 401, 404, 429]).toContain(res.status())
    })
  })

  test.describe('Authenticated endpoints', () => {
    let token

    test.beforeAll(async ({ request }) => {
      test.skip(!OTP_CODE, 'Skipped — OTP_CODE env var not set')
      const result = await verifyOtp(request, OTP_CODE)
      token = result.access
    })

    const endpoints = [
      { method: 'GET', path: '/menu/menus/',      label: 'menu list'       },
      { method: 'GET', path: '/menu/categories/', label: 'category list'   },
      { method: 'GET', path: '/menu/items/',      label: 'item list'       },
      { method: 'GET', path: '/orders/',          label: 'order list'      },
      { method: 'GET', path: '/tables/',          label: 'table list'      },
      { method: 'GET', path: '/staff/',           label: 'staff list'      },
    ]

    for (const { method, path, label } of endpoints) {
      test(`${method} ${path} returns 200 (${label})`, async ({ request }) => {
        const { status } = await apiRequest(request, method, path)
        expect(status).toBe(200)
      })
    }

    test('all responses return JSON (not HTML 404)', async ({ request }) => {
      for (const { method, path } of endpoints) {
        const { body } = await apiRequest(request, method, path)
        // HTML 404 bodies start with <!doctype — should be an object/array instead
        expect(typeof body === 'object' && body !== null).toBe(true)
      }
    })

    test('token is valid (not null string)', async ({ request }) => {
      const t = token
      expect(typeof t).toBe('string')
      expect(t.length).toBeGreaterThan(20)
    })
  })
})

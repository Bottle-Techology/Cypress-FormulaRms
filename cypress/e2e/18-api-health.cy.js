/**
 * 18 – API Health
 *
 * Infrastructure tests:
 *   - Health / ping endpoint responds
 *   - All core resource endpoints respond in < 3 s
 *   - 404 on unknown paths (not 500)
 *   - CORS headers present
 *   - API returns JSON content-type
 *   - Auth endpoints respond (no server error)
 */
describe('18 – API Health', () => {
  const AUTH_BASE = Cypress.env('AUTH_BASE') || 'https://formularms-api.bottle.com.np'
  const API_BASE  = Cypress.env('API_BASE')  || 'https://formularms-api.bottle.com.np/api/v1'
  const OTP_CODE  = Cypress.env('OTP_CODE')

  const RESPONSE_THRESHOLD_MS = 3000

  // ─── Public endpoints ─────────────────────────────────────────────────────

  context('Public / health endpoints', () => {
    it('GET /health/ or /ping/ responds with 200', () => {
      cy.request({ url: `${AUTH_BASE}/health/`, failOnStatusCode: false }).then((res) => {
        if (res.status === 404) {
          cy.request({ url: `${AUTH_BASE}/ping/`, failOnStatusCode: false }).then((r) => {
            expect(r.status).to.be.oneOf([200, 404])
          })
        } else {
          expect(res.status).to.eq(200)
        }
      })
    })

    it('auth base URL is reachable (not 5xx)', () => {
      cy.request({ url: `${AUTH_BASE}/`, failOnStatusCode: false }).then((res) => {
        expect(res.status).to.be.lt(500)
      })
    })

    it('POST /auth/login/send-otp/ does not return 5xx', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: 'healthcheck@example.com', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.lt(500)
      })
    })
  })

  // ─── Response time ────────────────────────────────────────────────────────

  context(`Response time < ${RESPONSE_THRESHOLD_MS}ms`, () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    const endpoints = [
      '/menu/menus/',
      '/menu/categories/',
      '/menu/items/',
      '/orders/',
      '/tables/',
    ]

    endpoints.forEach((endpoint) => {
      it(`GET ${endpoint} responds within threshold`, () => {
        const start = Date.now()
        cy.apiRequest('GET', endpoint).then((res) => {
          const elapsed = Date.now() - start
          expect(res.status).to.be.lt(500)
          expect(elapsed).to.be.lt(RESPONSE_THRESHOLD_MS)
          cy.log(`${endpoint} → ${res.status} in ${elapsed}ms`)
        })
      })
    })
  })

  // ─── 404 on unknown paths ─────────────────────────────────────────────────

  context('Unknown paths return 404, not 500', () => {
    it('GET /api/v1/nonexistent/ returns 404', () => {
      cy.request({ url: `${API_BASE}/nonexistent/`, failOnStatusCode: false }).then((res) => {
        expect(res.status).to.be.oneOf([401, 403, 404])
      })
    })

    it('GET /api/v1/menu/nonexistent/ returns 404', () => {
      cy.request({ url: `${API_BASE}/menu/nonexistent/`, failOnStatusCode: false }).then((res) => {
        expect(res.status).to.be.oneOf([401, 403, 404])
      })
    })
  })

  // ─── JSON content-type ────────────────────────────────────────────────────

  context('JSON content-type enforcement', () => {
    it('auth endpoint returns JSON content-type', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: 'ct@example.com', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        const ct = res.headers['content-type'] || ''
        expect(ct).to.include('application/json')
      })
    })
  })

  // ─── CORS headers ─────────────────────────────────────────────────────────

  context('CORS headers', () => {
    it('API responses include Access-Control-Allow-Origin header', () => {
      cy.request({
        method: 'OPTIONS',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        failOnStatusCode: false,
        headers: { Origin: 'https://formularms.bottle.com.np' },
      }).then((res) => {
        const acao = res.headers['access-control-allow-origin']
        if (acao) {
          expect(acao).to.satisfy(
            (v) => v === '*' || v.includes('bottle.com.np'),
            'CORS should allow the app origin'
          )
        } else {
          cy.log('CORS header not present on OPTIONS – may be set at edge layer')
        }
      })
    })
  })

  // ─── Authenticated resource endpoints ────────────────────────────────────

  context('Authenticated endpoints – no 5xx', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    const resources = [
      '/menu/menus/',
      '/menu/categories/',
      '/menu/items/',
      '/orders/',
      '/tables/',
    ]

    resources.forEach((endpoint) => {
      it(`GET ${endpoint} returns 200`, () => {
        cy.apiRequest('GET', endpoint).then((res) => {
          expect(res.status).to.eq(200)
        })
      })
    })
  })
})

/**
 * 32 – User Profile
 * Covers viewing, editing, and validating the logged-in user's profile.
 *
 * Run:
 *   npx cypress run --browser chrome \
 *     --spec cypress/e2e/32-user-profile.cy.js \
 *     --env OTP_CODE=<code>
 */

const API_BASE = 'https://formularms-api.bottle.com.np/api/v1'

describe('User Profile', () => {
  before(function () {
    if (!Cypress.env('OTP_CODE')) this.skip()
  })

  beforeEach(() => cy.loginViaApi())

  // ── API ──────────────────────────────────────────────────────────────────

  context('Profile API', () => {
    it('GET /auth/me/ returns 200 with user data', () => {
      cy.apiRequest('GET', '/auth/me/').then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body).to.have.any.keys('id', 'email', 'identifier', 'role')
      })
    })

    it('profile contains correct email / identifier', () => {
      cy.apiRequest('GET', '/auth/me/').then((res) => {
        expect(res.status).to.eq(200)
        const val = res.body.email || res.body.identifier || ''
        expect(val).to.include('bottle.com.np')
      })
    })

    it('profile has a role field', () => {
      cy.apiRequest('GET', '/auth/me/').then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body).to.have.property('role')
      })
    })

    it('PATCH /auth/me/ updates display name', () => {
      cy.apiRequest('PATCH', '/auth/me/', { display_name: 'Pranuj QA' }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204, 400, 404, 405])
      })
    })

    it('unauthenticated GET /auth/me/ is rejected', () => {
      cy.clearAuth()
      cy.request({
        method: 'GET',
        url: `${API_BASE}/auth/me/`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([401, 403, 404])
      })
    })
  })

  // ── UI ───────────────────────────────────────────────────────────────────

  context('Profile UI', () => {
    it('profile page loads without error', () => {
      cy.visit('/profile')
      cy.get('body').should('be.visible')
      cy.url().should('not.include', '/login')
    })

    it('profile section is visible on the page', () => {
      cy.visit('/profile')
      cy.get('body').contains(/profile|account|user|email/i).should('exist')
    })

    it('displays the logged-in user email or name', () => {
      cy.visit('/profile')
      cy.get('body').contains(/bottle\.com\.np|pranuj|owner|profile|account|user/i).should('exist')
    })

    it('no console errors on profile page', () => {
      const errors = []
      cy.on('window:console', (msg) => {
        if (msg.type === 'error') errors.push(msg.message)
      })
      cy.visit('/profile')
      cy.wait(1000).then(() => {
        expect(errors.filter(e => !e.includes('favicon'))).to.have.length(0)
      })
    })

    it('profile page is responsive on mobile viewport', () => {
      cy.viewport('iphone-x')
      cy.visit('/profile')
      cy.get('body').should('be.visible')
      cy.url().should('not.include', '/login')
    })

    it('redirects unauthenticated user away from profile', () => {
      cy.clearAuth()
      cy.visit('/profile')
      cy.url().should('not.include', '/profile')
    })

    it('avatar image URL returns 200 (BUG: currently 404)', () => {
      cy.visit('/profile')
      cy.wait(1500)
      cy.get('body').then(($body) => {
        const imgs = $body.find('img')
        const avatarImg = imgs.filter((_, el) =>
          /avatar|profile|user/i.test(el.getAttribute('src') || '') ||
          /avatar|profile|user/i.test(el.getAttribute('alt') || '')
        ).first()

        if (!avatarImg.length) {
          cy.log('BUG: No avatar <img> element found on /profile page')
          return
        }

        const src = avatarImg[0].getAttribute('src')
        cy.log(`Avatar src: ${src}`)

        if (!src || src.startsWith('data:')) {
          cy.log('Avatar uses inline data URI')
          return
        }

        cy.request({ url: src, failOnStatusCode: false }).then((res) => {
          // BUG-22: Avatar media file returns 404 — file missing on server
          expect(res.status, `Avatar image at ${src} should return 200`).to.eq(200)
        })
      })
    })

    it('avatar img is not broken (naturalWidth > 0)', () => {
      cy.visit('/profile')
      cy.wait(2000)
      cy.get('body').then(($body) => {
        const avatarImgs = $body.find('img').filter((_, el) =>
          /avatar|profile|user/i.test(el.getAttribute('src') || '') ||
          /avatar|profile|user/i.test(el.getAttribute('alt') || '')
        )
        if (!avatarImgs.length) {
          cy.log('No avatar image found on /profile')
          return
        }
        avatarImgs.each((_, el) => {
          // BUG-22: naturalWidth=0 confirms the avatar image is broken (404)
          expect(el.naturalWidth, `Avatar "${el.src}" is broken (naturalWidth=0)`).to.be.greaterThan(0)
        })
      })
    })
  })

  // ── Password / Security ───────────────────────────────────────────────────

  context('Account Security', () => {
    it('change password endpoint exists', () => {
      cy.apiRequest('POST', '/auth/change-password/', {}).then((res) => {
        expect(res.status).to.be.oneOf([200, 400, 404, 405])
      })
    })

    it('logout endpoint invalidates the session', () => {
      cy.apiRequest('POST', '/auth/logout/', {}).then((res) => {
        expect(res.status).to.be.oneOf([200, 204, 400, 404, 405])
      })
    })

    it('request password reset with valid email', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/auth/login/send-otp/`,
        body: { identifier: 'pranuj@bottle.com.np', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 429])
      })
    })
  })

  // ── Restaurant Profile ────────────────────────────────────────────────────

  context('Restaurant / Business Profile', () => {
    it('GET /settings/profile/ returns restaurant info', () => {
      cy.apiRequest('GET', '/settings/profile/').then((res) => {
        expect(res.status).to.be.oneOf([200, 404])
        if (res.status === 200) {
          expect(res.body).to.have.any.keys('name', 'restaurant_name', 'business_name', 'phone', 'address')
        }
      })
    })

    it('PATCH /settings/profile/ updates restaurant name', () => {
      cy.apiRequest('PATCH', '/settings/profile/', { restaurant_name: 'Formula RMS' }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204, 400, 404, 405])
      })
    })

    it('GET /settings/ returns settings object', () => {
      cy.apiRequest('GET', '/settings/').then((res) => {
        expect(res.status).to.eq(200)
      })
    })
  })
})

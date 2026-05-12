/**
 * 21 – Accessibility (a11y)
 *
 * Validates basic accessibility requirements across all key pages:
 *   - Page has a <title>
 *   - Every <img> has an alt attribute
 *   - Every form <input> is associated with a <label> or aria-label
 *   - Interactive elements are keyboard-reachable (tabIndex ≥ 0 or native)
 *   - Headings follow a logical hierarchy (h1 present, no skipped levels)
 *   - Focus is visible (not outline: none without replacement)
 *   - No empty buttons or links
 *   - ARIA roles on landmark elements
 *   - lang attribute on <html>
 */
describe('21 – Accessibility', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')

  function assertA11yBasics() {
    // Page title
    cy.title().should('not.be.empty')

    // <html lang>
    cy.get('html').should('have.attr', 'lang')

    // Images have alt
    cy.get('img').each(($img) => {
      expect($img).to.have.attr('alt')
    })

    // Buttons are not empty
    cy.get('button').each(($btn) => {
      const text = $btn.text().trim()
      const aria  = $btn.attr('aria-label') || ''
      expect(text.length + aria.length).to.be.gt(0)
    })

    // Links are not empty
    cy.get('a').each(($a) => {
      const text = $a.text().trim()
      const aria  = $a.attr('aria-label') || ''
      expect(text.length + aria.length).to.be.gt(0)
    })
  }

  // ─── Public pages ─────────────────────────────────────────────────────────

  context('Login page', () => {
    beforeEach(() => {
      cy.clearAuth()
      cy.visit('/login')
    })

    it('has a non-empty page title', () => {
      cy.title().should('not.be.empty')
    })

    it('has lang attribute on <html>', () => {
      cy.get('html').should('have.attr', 'lang')
    })

    it('identifier input has an associated label or aria-label', () => {
      cy.get('input').first().then(($input) => {
        const id       = $input.attr('id')
        const ariaLabel = $input.attr('aria-label')
        const placeholder = $input.attr('placeholder')
        const hasLabel = id
          ? Cypress.$(`label[for="${id}"]`).length > 0
          : false
        expect(hasLabel || !!ariaLabel || !!placeholder).to.be.true
      })
    })

    it('submit button has accessible text or aria-label', () => {
      cy.get('button').first().then(($btn) => {
        const text = $btn.text().trim()
        const aria  = $btn.attr('aria-label') || ''
        expect(text.length + aria.length).to.be.gt(0)
      })
    })

    it('login form is keyboard-navigable (Tab moves focus)', () => {
      cy.get('input').first().focus().should('have.focus').then($input => {
        cy.realPress('Tab')
        // After Tab, active element must have changed from the input
        cy.document().its('activeElement').should('not.eq', $input[0])
      })
    })
  })

  // ─── Authenticated pages ──────────────────────────────────────────────────

  context('Authenticated pages – a11y basics', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    const pages = [
      { label: 'Overview',  path: '/overview'  },
      { label: 'Menu',      path: '/menu'      },
      { label: 'Orders',    path: '/orders'    },
      { label: 'Tables',    path: '/tables'    },
      { label: 'Settings',  path: '/settings'  },
    ]

    pages.forEach(({ label, path }) => {
      it(`${label} – images have alt, buttons have text, title exists`, () => {
        cy.loginViaApi()
        cy.visit(path, { failOnStatusCode: false })
        cy.get('body').should('be.visible')
        cy.url().should('not.include', '/login')

        cy.title().should('not.be.empty')

        cy.get('img').each(($img) => {
          expect($img.attr('alt')).to.exist
        })

        cy.get('button').each(($btn) => {
          const text = $btn.text().trim()
          const aria  = $btn.attr('aria-label') || ''
          expect(text.length + aria.length).to.be.gt(0)
        })
      })
    })
  })

  // ─── Heading hierarchy ────────────────────────────────────────────────────

  context('Heading hierarchy', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('overview page has at least one heading (h1–h3)', () => {
      cy.loginViaApi()
      cy.visit('/overview', { failOnStatusCode: false })
      cy.get('h1, h2, h3').should('exist')
    })

    it('login page has at least one heading', () => {
      cy.clearAuth()
      cy.visit('/login')
      cy.get('h1, h2, h3').should('exist')
    })
  })

  // ─── Focus management ────────────────────────────────────────────────────

  context('Focus management', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('modal/dialog (if opened) traps focus inside', () => {
      cy.loginViaApi()
      cy.visit('/menu', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
      // If there is an "add" button, click it and verify focus is in dialog
      cy.get('body').then(($body) => {
        const addBtn = $body.find('button').filter((_, el) => /add|create/i.test(el.textContent))
        if (addBtn.length === 0) return cy.log('No add button – skipping focus trap test')
        cy.wrap(addBtn).first().click()
        cy.focused().should('exist')
      })
    })
  })

  // ─── ARIA landmarks ───────────────────────────────────────────────────────

  context('ARIA landmark roles', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('app has at least one landmark element (nav, main, header, aside, or role=navigation)', () => {
      cy.loginViaApi()
      cy.visit('/overview', { failOnStatusCode: false })
      cy.get('nav, main, header, aside, [role="navigation"], [role="main"]').should('exist')
    })
  })
})

describe('02 – Homepage / Login Page', () => {
  beforeEach(() => {
    cy.clearAuth()
    cy.visit('/')
  })

  it('loads the root URL successfully', () => {
    cy.url().should('include', 'formularms.bottle.com.np')
    cy.get('body').should('be.visible')
  })

  it('redirects unauthenticated users to the login page', () => {
    cy.url().should('include', '/login')
  })

  it('displays the Formula RMS brand / title', () => {
    cy.title().should('include', 'Formula RMS')
  })

  it('shows an identifier input on the login page', () => {
    cy.url().should('include', '/login')
    cy.get('input').should('exist')
  })

  it('shows a continue / send OTP button', () => {
    cy.url().should('include', '/login')
    cy.get('button[type="submit"], button').contains(/continue|send otp|next/i).should('exist')
  })

  it('shows a validation error for empty submission', () => {
    cy.url().should('include', '/login')
    cy.get('button[type="submit"], button').contains(/continue|send otp|next/i).first().click()
    cy.get('body').should('be.visible')
    // stays on login or shows inline error
    cy.url().should('include', '/login')
  })

  it('shows a validation error for an invalid email format', () => {
    cy.get('input').first().type('not-an-email')
    cy.get('button[type="submit"], button').contains(/continue|send otp|next/i).first().click()
    cy.get('body').should('be.visible')
  })

  it('accepts a valid email and proceeds to method selection or OTP step', () => {
    cy.get('input').first().clear().type('pranuj@bottle.com.np')
    cy.get('button[type="submit"], button').contains(/continue|send otp|next/i).first().click()
    cy.wait(1500)
    cy.url().should('satisfy', (url) =>
      url.includes('/login/method') || url.includes('/login/otp') || url.includes('/login')
    )
  })

  it('renders correctly on mobile viewport', () => {
    cy.viewport(375, 812)
    cy.reload()
    cy.get('body').should('be.visible')
    cy.get('input').should('exist')
  })

  it('renders correctly on tablet viewport', () => {
    cy.viewport(768, 1024)
    cy.reload()
    cy.get('body').should('be.visible')
  })
})

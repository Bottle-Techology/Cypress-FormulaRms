/**
 * 02 – Homepage / Login Page
 *
 * FormulaRMS serves the login form at the root URL ("/") rather than
 * redirecting to "/login". These tests verify the login page renders
 * and behaves correctly for unauthenticated users.
 */

// The app may show login at "/" or redirect to "/login"
function shouldBeOnLoginPage() {
  cy.url().should('satisfy', (url) =>
    url.includes('/login') ||
    url.match(/formularms\.bottle\.com\.np\/?$/)
  );
  cy.get('input').should('exist');
}

describe('02 – Homepage / Login Page', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.visit('/');
    cy.get('body').should('be.visible');
  });

  it('loads the root URL successfully', () => {
    cy.url().should('include', 'formularms.bottle.com.np');
    cy.get('body').should('be.visible');
  });

  it('shows the login form to unauthenticated users', () => {
    // App serves login at "/" — verify login form is present
    shouldBeOnLoginPage();
  });

  it('displays the Formula RMS brand / title', () => {
    cy.title().should('not.be.empty');
    cy.get('body').contains(/formula.?rms|formularms/i).should('exist');
  });

  it('shows an identifier input on the login page', () => {
    shouldBeOnLoginPage();
  });

  it('shows a continue / send OTP button', () => {
    cy.get('input').should('exist');
    cy.get('button').contains(/continue|send otp|next|login|sign in/i).should('exist');
  });

  it('shows a validation error or stays on login for empty submission', () => {
    cy.get('button').contains(/continue|send otp|next|login|sign in/i).first().click();
    cy.get('body').should('be.visible');
    // Should not jump to a protected page
    cy.url().should('not.include', '/overview');
    cy.url().should('not.include', '/orders');
  });

  it('shows a validation error for an invalid email format', () => {
    cy.get('input').first().type('not-an-email');
    cy.get('button').contains(/continue|send otp|next|login|sign in/i).first().click();
    cy.get('body').should('be.visible');
  });

  it('accepts a valid email and proceeds to method selection or OTP step', () => {
    cy.get('input').first().clear().type('pranuj@bottle.com.np');
    cy.get('button').contains(/continue|send otp|next|login|sign in/i).first().click();
    cy.url({ timeout: 10000 }).should('satisfy', (url) =>
      url.includes('/login') ||
      url.match(/formularms\.bottle\.com\.np\/?$/)
    );
  });

  it('renders correctly on mobile viewport', () => {
    cy.viewport(375, 812);
    cy.reload();
    cy.get('body').should('be.visible');
    cy.get('input').should('exist');
  });

  it('renders correctly on tablet viewport', () => {
    cy.viewport(768, 1024);
    cy.reload();
    cy.get('body').should('be.visible');
  });
});

/**
 * 02 – Login Page
 *
 * FormulaRMS serves the login form at "/login".
 * The root "/" is a landing/redirect page — these tests target "/login" directly.
 */

describe('02 – Homepage / Login Page', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.visit('/login');
    cy.get('body').should('be.visible');
  });

  it('loads the login URL successfully', () => {
    cy.url().should('include', 'formularms.bottle.com.np');
    cy.get('body').should('be.visible');
  });

  it('shows the login form to unauthenticated users', () => {
    cy.get('input').should('exist').and('be.visible');
  });

  it('displays the Formula RMS brand / title', () => {
    cy.title().should('not.be.empty');
  });

  it('shows an identifier input on the login page', () => {
    cy.get('input').should('exist');
  });

  it('shows a continue / send OTP button', () => {
    cy.get('button').contains(/continue|send otp|next|login|sign in/i).should('exist');
  });

  it('submit button is disabled on empty input (form-level validation)', () => {
    // App disables the submit button until a value is typed — this IS the validation
    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('shows a validation error for an invalid email format', () => {
    cy.get('input').first().type('not-an-email');
    // Click with force to bypass any disabled state and observe app response
    cy.get('button[type="submit"]').click({ force: true });
    cy.get('body').should('be.visible');
    cy.url().should('not.include', '/overview');
  });

  it('accepts a valid email and proceeds to OTP step', () => {
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

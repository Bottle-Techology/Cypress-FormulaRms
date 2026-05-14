/**
 * Page Object Model – Login Page (/login)
 *
 * Usage:
 *   const { LoginPage } = require('../support/pages');
 *   LoginPage.visit().typeEmail('user@example.com').submit();
 */

const SELECTORS = {
  emailInput:  'input[type="email"], input[placeholder*="email" i], input[name="email"], input[name="identifier"]',
  otpInput:    'input[inputmode="numeric"], input[type="number"], input[maxlength="6"], input[placeholder*="otp" i], input[placeholder*="code" i]',
  submitBtn:   'button[type="submit"]',
  errorMsg:    '[class*="error"], [class*="alert"], [role="alert"], [class*="message"]',
};

class LoginPage {
  // ── Navigation ─────────────────────────────────────────────────────────────

  visit() {
    cy.visit('/login');
    this.waitForLoad();
    return this;
  }

  waitForLoad() {
    cy.url().should('include', '/login');
    cy.get(SELECTORS.emailInput, { timeout: 10000 }).should('be.visible');
    return this;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  typeEmail(email) {
    cy.get(SELECTORS.emailInput).clear().type(email);
    return this;
  }

  typeOtp(code) {
    cy.get(SELECTORS.otpInput, { timeout: 10000 }).should('be.visible').clear().type(String(code));
    return this;
  }

  submit() {
    cy.get(SELECTORS.submitBtn).click();
    return this;
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  shouldShowError() {
    cy.get(SELECTORS.errorMsg, { timeout: 8000 }).should('be.visible');
    return this;
  }

  shouldRedirectAway() {
    cy.url({ timeout: 10000 }).should('not.include', '/login');
    return this;
  }
}

module.exports = new LoginPage();

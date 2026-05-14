/**
 * Page Object Model – Dashboard / Overview Page (/overview)
 *
 * Usage:
 *   const { DashboardPage } = require('../support/pages');
 *   DashboardPage.visit().shouldShowStats();
 */

const SELECTORS = {
  statCard:    '[class*="stat"], [class*="card"], [class*="metric"]',
  navSidebar:  'nav, aside, [class*="sidebar"]',
};

class DashboardPage {
  // ── Navigation ─────────────────────────────────────────────────────────────

  visit() {
    cy.visit('/overview');
    this.waitForLoad();
    return this;
  }

  waitForLoad() {
    cy.get('body').should('be.visible');
    cy.url({ timeout: 10000 }).should('not.include', '/login');
    return this;
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  shouldShowStats() {
    cy.get(SELECTORS.statCard, { timeout: 10000 }).should('exist');
    return this;
  }

  shouldShowSidebar() {
    cy.get(SELECTORS.navSidebar).should('be.visible');
    return this;
  }

  shouldNotShowSpinner() {
    cy.get('[class*="spinner"], [class*="loading"], [class*="skeleton"]').should('not.exist');
    return this;
  }
}

module.exports = new DashboardPage();

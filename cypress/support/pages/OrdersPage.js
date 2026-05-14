/**
 * Page Object Model – Orders Page (/orders)
 *
 * Usage:
 *   const { OrdersPage } = require('../support/pages');
 *   OrdersPage.visit().filterByStatus('pending');
 */

const SELECTORS = {
  statusFilter: (status) => `button:contains("${status}"), [data-status="${status}"]`,
  orderRow:     '[class*="order"], tr, [data-cy="order-row"]',
  emptyState:   '[class*="empty"], [class*="no-orders"]',
};

class OrdersPage {
  // ── Navigation ─────────────────────────────────────────────────────────────

  visit() {
    cy.visit('/orders');
    this.waitForLoad();
    return this;
  }

  waitForLoad() {
    cy.get('body').should('be.visible');
    cy.url().should('include', '/orders');
    return this;
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  filterByStatus(status) {
    cy.get('body').contains(new RegExp(status, 'i')).first().click();
    cy.get('body').should('be.visible');
    return this;
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  shouldShowStatusFilter(status) {
    cy.get('body').contains(new RegExp(status, 'i')).should('exist');
    return this;
  }

  shouldHaveOrders() {
    cy.get(SELECTORS.orderRow).should('have.length.gt', 0);
    return this;
  }
}

module.exports = new OrdersPage();

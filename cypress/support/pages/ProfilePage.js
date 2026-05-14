/**
 * Page Object Model – Profile Page (/profile)
 *
 * Usage:
 *   const { ProfilePage } = require('../support/pages');
 *   ProfilePage.visit().switchTab('Security');
 */

const TEXT_INPUT_SEL = [
  'input:not([type="hidden"])',
  ':not([type="file"])',
  ':not([type="submit"])',
  ':not([type="checkbox"])',
  ':not([type="radio"])',
].join('');

const SELECTORS = {
  textInput:   TEXT_INPUT_SEL,
  fileInput:   'input[type="file"]',
  saveBtn:     'button:contains("Save changes")',
  signOutBtn:  'button:contains("Sign out")',
  collapseBtn: '.rms-collapse-btn',
  dropdown:    'select',
  toggle:      '[role="switch"]',
  tabBtn:      (name) => `button:contains("${name}")`,
};

class ProfilePage {
  // ── Navigation ─────────────────────────────────────────────────────────────

  visit() {
    cy.visit('/profile');
    this.waitForLoad();
    return this;
  }

  waitForLoad() {
    cy.url({ timeout: 10000 }).should('include', '/profile');
    cy.get('button', { timeout: 10000 }).should('have.length.gt', 0);
    return this;
  }

  // ── Tab switching ──────────────────────────────────────────────────────────

  switchTab(tabName) {
    cy.contains('button', tabName).click();
    // Wait for the new tab's content to stabilise (at least one visible element change)
    cy.contains('button', tabName).should('satisfy', ($btn) =>
      $btn.hasClass('active') ||
      $btn.attr('aria-selected') === 'true' ||
      $btn.attr('data-active') === 'true' ||
      $btn.hasClass('selected') ||
      $btn.css('font-weight') === '700' ||
      $btn.css('border-bottom-color') !== 'rgba(0, 0, 0, 0)'
    );
    return this;
  }

  ensurePersonalInfoVisible() {
    cy.get('body').then(($body) => {
      const hasInput = $body.find(TEXT_INPUT_SEL).length > 0;
      if (!hasInput) {
        cy.contains('button', 'Personal Info').click();
        cy.get(TEXT_INPUT_SEL, { timeout: 8000 }).should('have.length.gt', 0);
      }
    });
    return this;
  }

  // ── Form helpers ───────────────────────────────────────────────────────────

  getTextInput(index = 0) {
    return cy.get(TEXT_INPUT_SEL).eq(index);
  }

  getSaveButton() {
    return cy.contains('button', 'Save changes');
  }

  clickSave() {
    cy.contains('button', 'Save changes').should('not.be.disabled').click();
    return this;
  }

  getFileInput() {
    return cy.get(SELECTORS.fileInput);
  }

  // ── Dropdowns & toggles (Preferences tab) ─────────────────────────────────

  getDropdown(index = 0) {
    return cy.get(SELECTORS.dropdown).eq(index);
  }

  selectDropdownOption(index, optionValue) {
    cy.get(SELECTORS.dropdown).eq(index).select(optionValue);
    return this;
  }

  selectDifferentDropdownOption(index) {
    cy.get(SELECTORS.dropdown).eq(index).then(($sel) => {
      const current = $sel.val();
      const newOpt  = $sel.find('option').filter((_, o) => o.value !== current).first();
      if (newOpt.length) cy.wrap($sel).select(newOpt.val());
    });
    return this;
  }

  getToggle(index = 0) {
    return cy.get(SELECTORS.toggle).eq(index);
  }

  clickToggle(index = 0) {
    cy.get(SELECTORS.toggle).eq(index).click();
    return this;
  }

  // ── Sign-out ───────────────────────────────────────────────────────────────

  signOut() {
    cy.contains('button', 'Sign out').click();
    cy.url({ timeout: 10000 }).should('not.include', '/profile');
    return this;
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────

  toggleSidebar() {
    cy.get(SELECTORS.collapseBtn).click();
    return this;
  }

  getSidebarWidth() {
    return cy.get('nav, aside, [class*="sidebar"], [class*="nav"]').first().invoke('outerWidth');
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  saveButtonShouldBeDisabled() {
    this.getSaveButton().then(($btn) => {
      expect(
        $btn.is(':disabled') || $btn.prop('disabled') || $btn.hasClass('disabled'),
        'Save changes button should be disabled'
      ).to.be.true;
    });
    return this;
  }

  saveButtonShouldBeEnabled() {
    this.getSaveButton().should('not.be.disabled');
    return this;
  }
}

module.exports = new ProfilePage();

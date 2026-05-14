/**
 * 34 – Preferences Tab Button Functionality
 *
 * Verifies every interactive element on the Preferences tab of /profile.
 *
 * Design principles applied:
 *   ✅ No hardcoded cy.wait(ms) — all waits replaced with element assertions
 *   ✅ Page Object Model   — ProfilePage wraps all selectors
 *   ✅ AAA pattern         — Arrange / Act / Assert per test
 *   ✅ Atomic tests        — one assertion concept per it() block
 *   ✅ BUG markers         — known Save-disabled bug documented explicitly
 *
 * Elements covered:
 *   - 4 dropdowns : Language | Timezone | Currency | Date Format
 *   - 6 toggles   : notification / feature aria-switch buttons
 *   - Save changes: disabled by default (BUG-23: also stays disabled on change)
 */

const { ProfilePage } = require('../support/pages');

describe('34 – Preferences Tab Button Functionality', () => {
  before(function () {
    if (!Cypress.env('OTP_CODE')) this.skip();
  });

  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('401') || err.message.includes('Request failed')) return false;
    return true;
  });

  beforeEach(() => {
    // Arrange: authenticated session, navigate to profile, activate Preferences tab
    cy.loginViaApi();
    ProfilePage.visit();
    ProfilePage.switchTab('Preferences');

    // Confirm the tab content has loaded before tests begin
    cy.get('select', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  // ── Save Changes ──────────────────────────────────────────────────────────

  context('Save changes button', () => {
    it('is disabled by default on the Preferences tab', () => {
      // Assert (no action needed — state is the assertion)
      ProfilePage.saveButtonShouldBeDisabled();
    });

    it('BUG-23: stays disabled after changing a dropdown — preferences cannot be saved', () => {
      // Act: change the first dropdown to a different value
      ProfilePage.selectDifferentDropdownOption(0);

      // Assert: button reflects the change (currently broken — save stays disabled)
      ProfilePage.getSaveButton().then(($btn) => {
        const disabled = $btn.is(':disabled') || $btn.prop('disabled') || $btn.hasClass('disabled');
        cy.log(`BUG-23: Save changes disabled after dropdown change: ${disabled}`);
        expect(disabled, 'BUG-23: Save changes never enables on Preferences tab').to.be.false;
      });
    });

    it('BUG-23: stays disabled after toggling a switch — preferences cannot be saved', () => {
      // Arrange: capture initial aria-checked state of first toggle
      cy.get('[role="switch"]').first().invoke('attr', 'aria-checked').then((before) => {
        // Act
        cy.get('[role="switch"]').first().click();

        // Assert: toggle state changed (proves interaction registered)
        cy.get('[role="switch"]').first()
          .invoke('attr', 'aria-checked')
          .should('not.eq', before);
      });

      // Assert: save button is still disabled (the bug)
      ProfilePage.getSaveButton().then(($btn) => {
        const disabled = $btn.is(':disabled') || $btn.prop('disabled') || $btn.hasClass('disabled');
        cy.log(`BUG-23: Save changes disabled after toggle change: ${disabled}`);
        expect(disabled, 'BUG-23: Save changes never enables on Preferences tab').to.be.false;
      });
    });

    it('BUG-23 confirmed: Save changes is permanently disabled — dropdown changes are lost', () => {
      // Arrange: change a dropdown
      ProfilePage.selectDifferentDropdownOption(0);

      // Assert: the button remains disabled (documenting the active bug)
      ProfilePage.getSaveButton().should('be.disabled');
      cy.log('BUG-23 CONFIRMED: Save changes is permanently disabled on the Preferences tab. Changes are lost on navigation.');
    });
  });

  // ── Dropdowns ─────────────────────────────────────────────────────────────

  context('Dropdown selects', () => {
    [
      { label: 'Language',    index: 0 },
      { label: 'Timezone',    index: 1 },
      { label: 'Currency',    index: 2 },
      { label: 'Date Format', index: 3 },
    ].forEach(({ label, index }) => {
      it(`${label} dropdown has multiple options`, () => {
        // Assert
        ProfilePage.getDropdown(index).then(($sel) => {
          expect($sel.find('option').length, `${label} should have > 1 option`).to.be.gt(1);
        });
      });
    });

    it('selecting a different Language option updates the dropdown value', () => {
      // Arrange: read current value
      ProfilePage.getDropdown(0).then(($sel) => {
        const currentVal = $sel.val();
        const newOpt = $sel.find('option').filter((_, o) => o.value !== currentVal).first();
        if (!newOpt.length) { cy.log('Only one language option — skipping'); return; }

        // Act
        cy.wrap($sel).select(newOpt.val());

        // Assert: dropdown reflects the selection (synchronous DOM update — no wait needed)
        cy.wrap($sel).should('have.value', newOpt.val());
      });
    });

    it('selecting a different Date Format option updates the dropdown value', () => {
      // Arrange
      ProfilePage.getDropdown(3).then(($sel) => {
        const currentVal = $sel.val();
        const newOpt = $sel.find('option').filter((_, o) => o.value !== currentVal).first();
        if (!newOpt.length) { cy.log('Only one format option — skipping'); return; }

        // Act
        cy.wrap($sel).select(newOpt.val());

        // Assert
        cy.wrap($sel).should('have.value', newOpt.val());
      });
    });
  });

  // ── Toggle Switches ───────────────────────────────────────────────────────

  context('Toggle switches', () => {
    it('6 toggle switches are present on the Preferences tab', () => {
      // Assert
      cy.get('[role="switch"]').should('have.length', 6);
    });

    it('clicking a toggle flips its aria-checked attribute', () => {
      // Arrange
      cy.get('[role="switch"]').first().invoke('attr', 'aria-checked').then((before) => {
        // Act
        cy.get('[role="switch"]').first().click();

        // Assert: aria-checked changed (.invoke.should retries until condition met)
        cy.get('[role="switch"]').first()
          .invoke('attr', 'aria-checked')
          .should('not.eq', before);
      });
    });

    it('all currently-on toggles can be clicked off and back on', () => {
      // Act + Assert: each ON toggle turns OFF, then restores
      cy.get('[role="switch"][aria-checked="true"]').each(($toggle) => {
        cy.wrap($toggle).click();
        cy.wrap($toggle).invoke('attr', 'aria-checked').should('eq', 'false');

        cy.wrap($toggle).click();
        cy.wrap($toggle).invoke('attr', 'aria-checked').should('eq', 'true');
      });
    });

    it('all currently-off toggles can be clicked on and back off', () => {
      cy.get('[role="switch"]').then(($toggles) => {
        const offToggles = $toggles.filter('[aria-checked="false"]');

        if (!offToggles.length) {
          // Arrange: turn first toggle off, then test turning on
          cy.wrap($toggles.first()).click();
          cy.wrap($toggles.first()).invoke('attr', 'aria-checked').should('eq', 'false');

          // Act + Assert: turn it back on
          cy.wrap($toggles.first()).click();
          cy.wrap($toggles.first()).invoke('attr', 'aria-checked').should('eq', 'true');
          return;
        }

        // Act + Assert: each OFF toggle turns ON, then restores to OFF
        cy.wrap(offToggles).each(($toggle) => {
          cy.wrap($toggle).click();
          cy.wrap($toggle).invoke('attr', 'aria-checked').should('eq', 'true');

          cy.wrap($toggle).click();
          cy.wrap($toggle).invoke('attr', 'aria-checked').should('eq', 'false');
        });
      });
    });
  });
});

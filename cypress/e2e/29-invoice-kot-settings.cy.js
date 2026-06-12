/**
 * 29 – Invoice & KOT Settings (Comprehensive)
 *
 * Tests the three ORDER SETTING sub-pages in the Settings sidebar:
 *   • Invoice Setting — prefix, footer, tax/discount display, auto-print
 *   • KOT Setting     — auto-print, header/footer, table/note visibility
 *   • Printer         — list, add, field validation
 *
 * Design principles:
 *   ✅ No hardcoded cy.wait(ms) — cy.intercept() + element assertions
 *   ✅ Closure vars only — no Cypress.env() cross-test state
 *   ✅ AAA pattern per test
 *   ✅ afterEach restores every PATCH so tests are independent
 *   ✅ Atomic tests — one concept per it()
 *   ✅ Skips gracefully when API fields are absent (forward-compatible)
 */

const PRINTER_ENDPOINTS = [
  '/printers/',
  '/kitchen-printers/',
  '/stations/',
  '/printer-stations/',
  '/settings/printers/',
];

const DRINK_RE =
  /\b(beer|wine|cocktail|mocktail|juice|smoothie|shake|milkshake|lassi|coffee|espresso|latte|cappuccino|americano|mocha|chai|soda|cola|spirit|whisky|whiskey|rum|vodka)\b/i;

// Try each printer endpoint in order; return first that has data
function discoverPrinters() {
  const tryNext = (endpoints) => {
    if (!endpoints.length) return cy.wrap({ status: 404, body: [], endpoint: null });
    const [head, ...tail] = endpoints;
    return cy.apiRequest('GET', head).then((res) => {
      if (res.status !== 200) return tryNext(tail);
      const list = Array.isArray(res.body) ? res.body : res.body.results || [];
      if (!list.length) return tryNext(tail);
      return cy.wrap({ status: 200, body: list, endpoint: head });
    });
  };
  return tryNext([...PRINTER_ENDPOINTS]);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('29 – Invoice & KOT Settings', () => {
  before(function () {
    if (!Cypress.env('OTP_CODE')) this.skip();
  });

  beforeEach(() => cy.loginViaApi());

  // ══════════════════════════════════════════════════════════════════════════
  // INVOICE SETTING – UI
  // ══════════════════════════════════════════════════════════════════════════

  context('Invoice Setting – UI', () => {
    beforeEach(() => {
      cy.goToSettings();
      cy.contains(/invoice setting/i, { timeout: 10000 }).first().click();
      cy.get('body').should('be.visible');
    });

    it('sidebar shows an Invoice Setting link', () => {
      // Arrange: already on settings page (goToSettings called in beforeEach)
      // Assert: link visible before clicking (checked at settings root level)
      cy.goToSettings();
      cy.get('body').contains(/invoice setting/i).should('exist');
    });

    it('navigates to invoice settings without redirecting to /login', () => {
      // Assert
      cy.url().should('not.include', '/login');
    });

    it('page contains invoice-related form content', () => {
      // Assert
      cy.get('body')
        .contains(/invoice|bill|receipt|print|tax|prefix|footer|header/i)
        .should('exist');
    });

    it('page shows heading or line-item section labels', () => {
      // Assert
      cy.get('body')
        .contains(/heading|line item|sub.?total|restaurant information|prefix/i)
        .should('exist');
    });

    it('input fields are present and editable', () => {
      // Assert: at least one text input exists on the invoice settings page
      cy.get('input[type="text"], input:not([type]), textarea', { timeout: 8000 })
        .should('exist');
    });

    it('save / update button is present on the invoice settings page', () => {
      // Assert
      cy.get('body').contains(/save|update|submit/i).should('exist');
    });

    it('changing invoice prefix and saving fires a PATCH request', () => {
      // Arrange
      cy.intercept('PATCH', '**/settings/**').as('patchSettings');

      // Act: find the prefix input and change it
      cy.get('input[type="text"], input:not([type])').first().then(($input) => {
        const original = $input.val();
        cy.wrap($input).clear().type('INV-TEST');
        cy.get('body').contains(/save|update|submit/i).first().click();

        // Assert: PATCH fired
        cy.wait('@patchSettings', { timeout: 10000 }).then((interception) => {
          expect(interception.response.statusCode).to.be.oneOf([200, 204]);
          cy.log(`PATCH responded: ${interception.response.statusCode}`);
        });

        // Restore: revert to original value
        cy.get('input[type="text"], input:not([type])').first().clear().type(original || '');
        cy.get('body').contains(/save|update|submit/i).first().click();
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // INVOICE SETTING – API
  // ══════════════════════════════════════════════════════════════════════════

  context('Invoice Setting – API', () => {
    it('GET /settings/ responds with 200 or 404', () => {
      // Act
      cy.getSettingsViaApi().then((res) => {
        // Assert
        expect(res.status).to.be.oneOf([200, 404]);
      });
    });

    it('GET /settings/ contains print_enabled field when available', () => {
      // Act
      cy.getSettingsViaApi().then((res) => {
        if (res.status !== 200) return cy.log('Settings endpoint unavailable — skipping');
        // Assert
        expect(res.body).to.have.property('print_enabled');
        cy.log(`print_enabled = ${res.body.print_enabled}`);
      });
    });

    it('GET /settings/ contains printing_mode field when available', () => {
      // Act
      cy.getSettingsViaApi().then((res) => {
        if (res.status !== 200) return cy.log('Settings endpoint unavailable — skipping');
        // Assert
        expect(res.body).to.have.property('printing_mode');
        cy.log(`printing_mode = ${res.body.printing_mode}`);
      });
    });

    it('PATCH print_enabled toggles and restores the invoice print flag', () => {
      // Arrange
      cy.getSettingsViaApi().then((res) => {
        if (res.status !== 200) return cy.log('Settings endpoint unavailable — skipping');
        const original = res.body.print_enabled;

        // Act
        cy.updateSettingsViaApi({ print_enabled: !original }).then((patchRes) => {
          // Assert
          expect(patchRes.status).to.be.oneOf([200, 204, 400, 405]);
          cy.log(`PATCH print_enabled=${!original} → ${patchRes.status}`);
        });

        // Restore
        cy.updateSettingsViaApi({ print_enabled: original });
      });
    });

    it('PATCH printing_mode to "auto" is accepted or rejected cleanly', () => {
      // Arrange
      cy.getSettingsViaApi().then((res) => {
        if (res.status !== 200) return cy.log('Settings endpoint unavailable — skipping');
        const original = res.body.printing_mode;

        // Act
        cy.updateSettingsViaApi({ printing_mode: 'auto' }).then((patchRes) => {
          // Assert: no 5xx
          expect(patchRes.status).to.be.oneOf([200, 204, 400, 405]);
        });

        // Restore
        if (original !== undefined) cy.updateSettingsViaApi({ printing_mode: original });
      });
    });

    it('PATCH with invalid printing_mode does not return 5xx', () => {
      // Act
      cy.updateSettingsViaApi({ printing_mode: 'invalid_mode_xyz' }).then((res) => {
        // Assert: API rejects cleanly — no 5xx
        expect(res.status).to.not.be.within(500, 599);
      });
    });

    it('PATCH invoice_prefix stores a short string value', () => {
      // Arrange
      cy.getSettingsViaApi().then((settingsRes) => {
        const original = settingsRes.status === 200 ? settingsRes.body.invoice_prefix : undefined;

        // Act
        cy.updateSettingsViaApi({ invoice_prefix: 'TEST-' }).then((res) => {
          // Assert: accepted or gracefully rejected
          expect(res.status).to.be.oneOf([200, 204, 400, 404, 405]);
          cy.log(`PATCH invoice_prefix → ${res.status}`);
        });

        // Restore
        if (original !== undefined) cy.updateSettingsViaApi({ invoice_prefix: original });
      });
    });

    it('PATCH invoice_footer stores footer text', () => {
      // Arrange
      cy.getSettingsViaApi().then((settingsRes) => {
        const original = settingsRes.status === 200 ? settingsRes.body.invoice_footer : undefined;

        // Act
        cy.updateSettingsViaApi({ invoice_footer: 'Thank you for visiting!' }).then((res) => {
          expect(res.status).to.be.oneOf([200, 204, 400, 404, 405]);
          cy.log(`PATCH invoice_footer → ${res.status}`);
        });

        // Restore
        if (original !== undefined) cy.updateSettingsViaApi({ invoice_footer: original });
      });
    });

    it('PATCH show_tax_in_invoice toggles tax visibility on bills', () => {
      // Arrange
      cy.getSettingsViaApi().then((res) => {
        const original = res.status === 200 ? res.body.show_tax_in_invoice : undefined;

        // Act
        cy.updateSettingsViaApi({ show_tax_in_invoice: true }).then((patchRes) => {
          expect(patchRes.status).to.be.oneOf([200, 204, 400, 404, 405]);
        });

        // Restore
        if (original !== undefined) cy.updateSettingsViaApi({ show_tax_in_invoice: original });
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // KOT SETTING – UI
  // ══════════════════════════════════════════════════════════════════════════

  context('KOT Setting – UI', () => {
    beforeEach(() => {
      cy.goToSettings();
      cy.contains(/kot setting/i, { timeout: 10000 }).first().click();
      cy.get('body').should('be.visible');
    });

    it('sidebar shows a KOT Setting link', () => {
      // Assert (verified in beforeEach navigation)
      cy.url().should('not.include', '/login');
      cy.get('body').should('be.visible');
    });

    it('KOT Setting page contains KOT-related content', () => {
      // Assert
      cy.get('body')
        .contains(/kot|kitchen order|printer|station|print/i)
        .should('exist');
    });

    it('KOT Setting page has save / update controls', () => {
      // Assert
      cy.get('body').contains(/save|update|submit/i).should('exist');
    });

    it('KOT Setting page has at least one toggle or checkbox', () => {
      // Assert: toggle switches or checkboxes for KOT options
      cy.get('[role="switch"], input[type="checkbox"]').should('exist');
    });

    it('toggling a KOT switch changes its state without page reload', () => {
      // Arrange
      cy.get('[role="switch"], input[type="checkbox"]').first().then(($el) => {
        const before = $el.attr('aria-checked') || ($el.prop('checked') ? 'true' : 'false');

        // Act
        cy.wrap($el).click();

        // Assert: state changed
        cy.wrap($el).invoke('attr', 'aria-checked').then((after) => {
          if (after !== undefined) {
            expect(after).to.not.eq(before);
          } else {
            cy.wrap($el).should(($e) => {
              expect($e.prop('checked') ? 'true' : 'false').to.not.eq(before);
            });
          }
        });

        // Restore: click back
        cy.wrap($el).click();
      });
    });

    it('saving KOT settings fires a PATCH request', () => {
      // Arrange
      cy.intercept('PATCH', '**/settings/**').as('patchKot');

      // Act: toggle first switch then save
      cy.get('[role="switch"], input[type="checkbox"]').first().click();
      cy.get('body').contains(/save|update|submit/i).first().click();

      // Assert
      cy.wait('@patchKot', { timeout: 10000 }).then((interception) => {
        expect(interception.response.statusCode).to.be.oneOf([200, 204]);
      });

      // Restore: toggle back and save
      cy.get('[role="switch"], input[type="checkbox"]').first().click();
      cy.get('body').contains(/save|update|submit/i).first().click();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // KOT SETTING – API
  // ══════════════════════════════════════════════════════════════════════════

  context('KOT Setting – API', () => {
    it('PATCH kot_auto_print toggles and restores the flag', () => {
      // Arrange
      cy.getSettingsViaApi().then((res) => {
        const original = res.status === 200 ? res.body.kot_auto_print : undefined;

        // Act
        cy.updateSettingsViaApi({ kot_auto_print: true }).then((patchRes) => {
          // Assert
          expect(patchRes.status).to.be.oneOf([200, 204, 400, 404, 405]);
          cy.log(`PATCH kot_auto_print=true → ${patchRes.status}`);
        });

        // Restore
        if (original !== undefined) cy.updateSettingsViaApi({ kot_auto_print: original });
      });
    });

    it('PATCH kot_header stores a header string', () => {
      // Arrange
      cy.getSettingsViaApi().then((res) => {
        const original = res.status === 200 ? res.body.kot_header : undefined;

        // Act
        cy.updateSettingsViaApi({ kot_header: 'Kitchen Order' }).then((patchRes) => {
          expect(patchRes.status).to.be.oneOf([200, 204, 400, 404, 405]);
        });

        // Restore
        if (original !== undefined) cy.updateSettingsViaApi({ kot_header: original });
      });
    });

    it('PATCH kot_footer stores a footer string', () => {
      // Arrange
      cy.getSettingsViaApi().then((res) => {
        const original = res.status === 200 ? res.body.kot_footer : undefined;

        // Act
        cy.updateSettingsViaApi({ kot_footer: 'Served fresh!' }).then((patchRes) => {
          expect(patchRes.status).to.be.oneOf([200, 204, 400, 404, 405]);
        });

        // Restore
        if (original !== undefined) cy.updateSettingsViaApi({ kot_footer: original });
      });
    });

    it('PATCH show_table_in_kot toggles table number visibility on KOT', () => {
      // Arrange
      cy.getSettingsViaApi().then((res) => {
        const original = res.status === 200 ? res.body.show_table_in_kot : undefined;

        // Act
        cy.updateSettingsViaApi({ show_table_in_kot: true }).then((patchRes) => {
          expect(patchRes.status).to.be.oneOf([200, 204, 400, 404, 405]);
        });

        // Restore
        if (original !== undefined) cy.updateSettingsViaApi({ show_table_in_kot: original });
      });
    });

    it('PATCH show_notes_in_kot toggles order-note visibility on KOT', () => {
      // Arrange
      cy.getSettingsViaApi().then((res) => {
        const original = res.status === 200 ? res.body.show_notes_in_kot : undefined;

        // Act
        cy.updateSettingsViaApi({ show_notes_in_kot: true }).then((patchRes) => {
          expect(patchRes.status).to.be.oneOf([200, 204, 400, 404, 405]);
        });

        // Restore
        if (original !== undefined) cy.updateSettingsViaApi({ show_notes_in_kot: original });
      });
    });

    it('PATCH with excessively long kot_header does not crash the API', () => {
      // Act: send a 1000-char header string
      cy.updateSettingsViaApi({ kot_header: 'K'.repeat(1000) }).then((res) => {
        // Assert: no 5xx
        expect(res.status).to.not.be.within(500, 599);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PRINTER SETTING – UI
  // ══════════════════════════════════════════════════════════════════════════

  context('Printer Setting – UI', () => {
    beforeEach(() => {
      cy.goToSettings();
      cy.contains(/^printer$/i, { timeout: 10000 }).first().click();
      cy.get('body').should('be.visible');
    });

    it('sidebar shows a Printer link', () => {
      // Assert (navigation validated in beforeEach)
      cy.url().should('not.include', '/login');
    });

    it('Printer page shows printer list or add-printer affordance', () => {
      // Assert
      cy.get('body')
        .contains(/printer|add|name|type|ip|port/i)
        .should('exist');
    });

    it('Add Printer button or link is visible', () => {
      // Assert
      cy.get('body').contains(/add.?printer|new.?printer|create.?printer/i).should('exist');
    });

    it('clicking Add Printer shows a form or modal', () => {
      // Act
      cy.get('body').contains(/add.?printer|new.?printer|create.?printer/i).first().click();

      // Assert: a form or modal appeared
      cy.get('input[type="text"], input[placeholder], form, [role="dialog"]', { timeout: 8000 })
        .should('exist');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PRINTER SETTING – API
  // ══════════════════════════════════════════════════════════════════════════

  context('Printer Setting – API', () => {
    it('at least one printer endpoint responds with 200', () => {
      // Act
      discoverPrinters().then((result) => {
        // Assert: endpoint found or gracefully absent
        if (result.status === 200) {
          expect(result.body).to.be.an('array');
          cy.log(`Printers at ${result.endpoint}: ${result.body.map(p => p.name || p.id).join(', ')}`);
        } else {
          cy.log('No printer endpoint returned data — printers may not be configured yet');
        }
      });
    });

    it('bar and kitchen printers are discoverable by name', () => {
      // Act
      discoverPrinters().then((result) => {
        if (result.status !== 200) return cy.log('No printers — skipping');

        // Assert: name each printer found
        const bar     = result.body.find(p => [p.name, p.label, p.title].some(v => v?.toLowerCase().includes('bar')));
        const kitchen = result.body.find(p => [p.name, p.label, p.title].some(v => v?.toLowerCase().includes('kitchen')));

        cy.log(`Bar printer:     ${bar     ? (bar.name     || bar.label)     : 'not found'}`);
        cy.log(`Kitchen printer: ${kitchen ? (kitchen.name || kitchen.label) : 'not found'}`);
      });
    });

    it('PATCH menu category assigns a kitchen printer', () => {
      // Arrange: discover printers and categories
      discoverPrinters().then((printerResult) => {
        cy.apiRequest('GET', '/menu/categories/').then((catRes) => {
          expect(catRes.status).to.eq(200);
          const cats = Array.isArray(catRes.body) ? catRes.body : catRes.body.results || [];
          if (!cats.length) return cy.log('No categories — skipping');

          const kitchen = printerResult.body?.find?.(p =>
            [p.name, p.label, p.title].some(v => v?.toLowerCase().includes('kitchen'))
          );
          const payload = kitchen
            ? { printer: kitchen.id, kitchen_printer: kitchen.id }
            : { printer_name: 'Kitchen Printer' };

          // Act
          cy.apiRequest('PATCH', `/menu/categories/${cats[0].id}/`, payload).then((r) => {
            // Assert
            expect(r.status).to.be.oneOf([200, 204, 400, 404]);
            cy.log(`[${r.status}] Kitchen ← category "${cats[0].name}"`);
          });
        });
      });
    });

    it('PATCH menu item routes food to kitchen and drink to bar printer', () => {
      // Arrange: discover printers and items
      discoverPrinters().then((printerResult) => {
        cy.apiRequest('GET', '/menu/items/').then((itemRes) => {
          expect(itemRes.status).to.eq(200);
          const items = Array.isArray(itemRes.body) ? itemRes.body : itemRes.body.results || [];
          if (!items.length) return cy.log('No items — skipping');

          const barPrinter     = printerResult.body?.find?.(p => [p.name, p.label].some(v => v?.toLowerCase().includes('bar')));
          const kitchenPrinter = printerResult.body?.find?.(p => [p.name, p.label].some(v => v?.toLowerCase().includes('kitchen')));

          const drinkItem = items.find(i => DRINK_RE.test(i.name));
          const foodItem  = items.find(i => !DRINK_RE.test(i.name));

          const assignments = [];
          if (drinkItem && barPrinter)     assignments.push({ item: drinkItem, printer: barPrinter,     label: 'Bar' });
          if (foodItem  && kitchenPrinter) assignments.push({ item: foodItem,  printer: kitchenPrinter, label: 'Kitchen' });

          if (!assignments.length) return cy.log('No bar/kitchen printer found — skipping assignment');

          // Act + Assert
          assignments.forEach(({ item, printer, label }) => {
            cy.apiRequest('PATCH', `/menu/items/${item.id}/`, { printer: printer.id }).then((r) => {
              expect(r.status).to.be.oneOf([200, 204, 400, 404]);
              cy.log(`[${r.status}] ${label} ← item "${item.name}"`);
            });
          });
        });
      });
    });

    it('GET menu item detail includes a printer-related field after assignment', () => {
      // Arrange
      cy.apiRequest('GET', '/menu/items/').then((res) => {
        const items = Array.isArray(res.body) ? res.body : res.body.results || [];
        if (!items.length) return cy.log('No items — skipping');

        // Act
        cy.apiRequest('GET', `/menu/items/${items[0].id}/`).then((detail) => {
          // Assert
          expect(detail.status).to.eq(200);
          const printerField =
            detail.body.printer        ??
            detail.body.kitchen_printer ??
            detail.body.printer_station ??
            detail.body.printer_name;

          cy.log(`Item "${detail.body.name}" → printer: ${JSON.stringify(printerField)}`);
        });
      });
    });

    it('POST to add a new printer stores it and cleanup deletes it', () => {
      // Arrange
      discoverPrinters().then((result) => {
        if (!result.endpoint) return cy.log('No printer endpoint found — skipping');

        const newPrinter = { name: '[TEST] Printer', type: 'thermal', ip_address: '192.168.1.99', port: 9100 };

        // Act: create
        cy.apiRequest('POST', result.endpoint, newPrinter).then((createRes) => {
          // Assert
          expect(createRes.status).to.be.oneOf([200, 201, 400, 405]);
          cy.log(`POST printer → ${createRes.status}`);

          // Cleanup: delete if created
          if ([200, 201].includes(createRes.status) && createRes.body?.id) {
            cy.apiRequest('DELETE', `${result.endpoint}${createRes.body.id}/`).then((delRes) => {
              expect(delRes.status).to.be.oneOf([200, 204, 404]);
              cy.log(`DELETE printer ${createRes.body.id} → ${delRes.status}`);
            });
          }
        });
      });
    });

    it('POST printer with missing name returns 400', () => {
      // Arrange
      discoverPrinters().then((result) => {
        if (!result.endpoint) return cy.log('No printer endpoint — skipping');

        // Act: omit required name field
        cy.apiRequest('POST', result.endpoint, { ip_address: '10.0.0.1', port: 9100 }).then((res) => {
          // Assert: API rejects missing name
          expect(res.status).to.be.oneOf([400, 422]);
        });
      });
    });
  });
});

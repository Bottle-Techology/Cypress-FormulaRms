"""
Generate FormulaRMS positive & negative test cases as a CSV
importable directly into Google Sheets.
"""

import csv, pathlib, textwrap

OUTPUT = pathlib.Path(__file__).parent.parent / "cypress/reports/formularms-testcases.csv"

HEADERS = [
    "SN",
    "Module",
    "Test Case ID",
    "Type",          # Positive / Negative
    "Title",
    "Preconditions",
    "Test Steps",
    "Expected Result",
    "Actual Result",
    "Status",        # Pass / Fail / Blocked / Not Run
    "Severity",      # Critical / High / Medium / Low
    "Priority",      # P1 / P2 / P3 / P4
    "Remarks",
]

# helper to join multi-step strings
def steps(*lines):
    return " | ".join(f"{i+1}. {l}" for i, l in enumerate(lines))

CASES = [

    # ─────────────────────────────────────────────────────────────────
    # 01  AUTHENTICATION
    # ─────────────────────────────────────────────────────────────────
    ("AUTH", "TC-AUTH-001", "Positive", "Login with valid email via OTP",
     "App is accessible",
     steps("Go to /login", "Enter valid email pranuj@bottle.com.np", "Click Send OTP",
           "Enter correct OTP received in email", "Click Verify"),
     "User is logged in and redirected to /overview dashboard",
     "", "", "Critical", "P1", ""),

    ("AUTH", "TC-AUTH-002", "Positive", "OTP is delivered to registered email",
     "Valid registered email exists",
     steps("POST /auth/login/send-otp/ with valid identifier and method=email"),
     "Response 200 with detail='otp_sent' and masked email",
     "", "", "Critical", "P1", ""),

    ("AUTH", "TC-AUTH-003", "Positive", "Session persists after page refresh",
     "User is logged in",
     steps("Login successfully", "Refresh the browser page"),
     "User remains on /overview without re-login prompt",
     "", "", "High", "P1", ""),

    ("AUTH", "TC-AUTH-004", "Positive", "Logout clears session and redirects to /login",
     "User is logged in",
     steps("Click logout / profile menu", "Select Logout"),
     "Access token removed from localStorage; URL becomes /login",
     "", "", "High", "P1", ""),

    ("AUTH", "TC-AUTH-005", "Positive", "Cached token reused across spec files",
     "OTP verified once in a run",
     steps("Verify OTP in first spec", "Run second spec that calls loginViaApi()"),
     "cy.task('getToken') returns cached token; no second OTP call needed",
     "", "", "Medium", "P2", ""),

    ("AUTH", "TC-AUTH-006", "Negative", "Login with unregistered email",
     "App is accessible",
     steps("Enter unregistered email", "Click Send OTP"),
     "Error response 400/404 — identifier not found",
     "", "", "High", "P1", ""),

    ("AUTH", "TC-AUTH-007", "Negative", "OTP verification with wrong code",
     "Valid OTP has been sent",
     steps("POST /auth/login/verify-otp/ with incorrect code"),
     "Response 400 with error message",
     "", "", "High", "P1", ""),

    ("AUTH", "TC-AUTH-008", "Negative", "OTP verification with expired code",
     "OTP sent more than 5 minutes ago",
     steps("Wait for OTP to expire", "Submit the expired code"),
     "Response 400/401 — OTP expired",
     "", "", "High", "P1", ""),

    ("AUTH", "TC-AUTH-009", "Negative", "Login with empty identifier",
     "App is accessible",
     steps("Leave email field blank", "Click Send OTP"),
     "Validation error shown; form not submitted",
     "", "", "Medium", "P2", ""),

    ("AUTH", "TC-AUTH-010", "Negative", "Access protected route without authentication",
     "User is not logged in",
     steps("Visit /overview directly without token"),
     "Redirected to /login",
     "", "", "Critical", "P1", ""),

    ("AUTH", "TC-AUTH-011", "Negative", "Invalid Bearer token rejected by API",
     "App is accessible",
     steps("Send GET /api/v1/orders/ with Authorization: Bearer invalid_token"),
     "Response 401 Unauthorized",
     "", "", "High", "P1", ""),

    ("AUTH", "TC-AUTH-012", "Negative", "Repeated wrong OTP triggers rate limit",
     "OTP sent to valid email",
     steps("Submit wrong OTP 5+ times consecutively"),
     "Response 429 Too Many Requests; further attempts blocked temporarily",
     "", "", "Medium", "P2", ""),

    # ─────────────────────────────────────────────────────────────────
    # 02  DASHBOARD / OVERVIEW
    # ─────────────────────────────────────────────────────────────────
    ("Dashboard", "TC-DASH-001", "Positive", "Dashboard loads with key metrics",
     "User is logged in",
     steps("Navigate to /overview"),
     "Page renders with order stats, revenue summary, and quick-action links",
     "", "", "High", "P1", ""),

    ("Dashboard", "TC-DASH-002", "Positive", "Dashboard shows today's order count",
     "At least one order exists for today",
     steps("Login", "Go to /overview"),
     "Order count widget shows a non-zero number",
     "", "", "Medium", "P2", ""),

    ("Dashboard", "TC-DASH-003", "Positive", "Sidebar navigation links are all clickable",
     "User is logged in",
     steps("Click each sidebar link (Orders, Menu, Tables, Settings, Reports)"),
     "Each link navigates to the correct page without error",
     "", "", "High", "P1", ""),

    ("Dashboard", "TC-DASH-004", "Negative", "Dashboard without auth shows login page",
     "No active session",
     steps("Clear localStorage", "Visit /overview"),
     "Redirected to /login",
     "", "", "Critical", "P1", ""),

    # ─────────────────────────────────────────────────────────────────
    # 03  MENU MANAGEMENT
    # ─────────────────────────────────────────────────────────────────
    ("Menu", "TC-MENU-001", "Positive", "Create a new menu",
     "User logged in with menu permission",
     steps("POST /api/v1/menu/menus/ with name='Dinner Menu'"),
     "Response 201; menu appears in GET /menu/menus/ list",
     "", "", "High", "P1", ""),

    ("Menu", "TC-MENU-002", "Positive", "Create a new food category",
     "At least one menu exists",
     steps("POST /api/v1/menu/categories/ with name='Starters'"),
     "Response 201; category in GET /menu/categories/ list",
     "", "", "High", "P1", ""),

    ("Menu", "TC-MENU-003", "Positive", "Create a veg menu item with valid price",
     "Category exists",
     steps("POST /api/v1/menu/items/ with name, base_price=150, food_type='veg'"),
     "Response 201; item appears in item list with correct food_type",
     "", "", "High", "P1", ""),

    ("Menu", "TC-MENU-004", "Positive", "Create a non-veg menu item",
     "Category exists",
     steps("POST /api/v1/menu/items/ with food_type='non_veg'"),
     "Response 201; food_type field is 'non_veg'",
     "", "", "High", "P1", ""),

    ("Menu", "TC-MENU-005", "Positive", "Update item price",
     "Item exists",
     steps("PATCH /api/v1/menu/items/:id/ with base_price=200"),
     "Response 200; GET item returns updated price 200",
     "", "", "High", "P1", ""),

    ("Menu", "TC-MENU-006", "Positive", "Toggle item availability off",
     "Item exists and is available",
     steps("PATCH /api/v1/menu/items/:id/ with is_available=false"),
     "Response 200; item shows as unavailable",
     "", "", "Medium", "P2", ""),

    ("Menu", "TC-MENU-007", "Positive", "Delete a menu item",
     "Item exists and is not in any active order",
     steps("DELETE /api/v1/menu/items/:id/"),
     "Response 204; item no longer in GET /menu/items/ list",
     "", "", "Medium", "P2", ""),

    ("Menu", "TC-MENU-008", "Positive", "filter items by food_type=veg",
     "Both veg and non-veg items exist",
     steps("GET /api/v1/menu/items/?food_type=veg"),
     "Response 200; all returned items have food_type='veg'",
     "", "", "Medium", "P2", ""),

    ("Menu", "TC-MENU-009", "Negative", "Create item with negative price",
     "User logged in",
     steps("POST /api/v1/menu/items/ with base_price=-10"),
     "Response 400 — price must be positive",
     "", "", "High", "P1", "Known bug: API currently returns 201"),

    ("Menu", "TC-MENU-010", "Negative", "Create item with zero price",
     "User logged in",
     steps("POST /api/v1/menu/items/ with base_price=0"),
     "Response 400 — price must be greater than zero",
     "", "", "High", "P1", "Known bug: API currently returns 201"),

    ("Menu", "TC-MENU-011", "Negative", "Create item with empty name",
     "User logged in",
     steps("POST /api/v1/menu/items/ with name='' and valid price"),
     "Response 400 — name is required",
     "", "", "Medium", "P2", ""),

    ("Menu", "TC-MENU-012", "Negative", "Access menu endpoints without authentication",
     "No active session",
     steps("GET /api/v1/menu/items/ with no Authorization header"),
     "Response 401 Unauthorized",
     "", "", "High", "P1", ""),

    ("Menu", "TC-MENU-013", "Negative", "Create item with invalid food_type value",
     "User logged in",
     steps("POST /api/v1/menu/items/ with food_type='alien'"),
     "Response 400 — food_type must be one of [veg, non_veg, egg]",
     "", "", "Medium", "P2", ""),

    # ─────────────────────────────────────────────────────────────────
    # 04  ORDERS
    # ─────────────────────────────────────────────────────────────────
    ("Orders", "TC-ORD-001", "Positive", "Create a takeaway order",
     "User logged in; items exist",
     steps("POST /api/v1/orders/ with type='takeaway', customer_name, customer_phone"),
     "Response 201; order appears in GET /orders/ with status='pending'",
     "", "", "Critical", "P1", ""),

    ("Orders", "TC-ORD-002", "Positive", "Create a dine-in order with a valid table",
     "User logged in; table exists and is available",
     steps("POST /api/v1/orders/ with type='dine_in', table=<table_id>"),
     "Response 201; order linked to the table",
     "", "", "Critical", "P1", ""),

    ("Orders", "TC-ORD-003", "Positive", "Add item to an existing order",
     "Open order exists; menu item exists",
     steps("POST /api/v1/orders/:id/add_items/ with items=[{menu_item, quantity}]"),
     "Response 200/201; item appears in order detail",
     "", "", "Critical", "P1", ""),

    ("Orders", "TC-ORD-004", "Positive", "Progress order: pending → preparing",
     "Order exists with status=pending",
     steps("PATCH /api/v1/orders/:id/ with status='preparing'"),
     "Response 200; order status is 'preparing'",
     "", "", "High", "P1", ""),

    ("Orders", "TC-ORD-005", "Positive", "Progress order: preparing → ready",
     "Order status is 'preparing'",
     steps("PATCH /api/v1/orders/:id/ with status='ready'"),
     "Response 200; order status is 'ready'",
     "", "", "High", "P1", ""),

    ("Orders", "TC-ORD-006", "Positive", "Generate bill for a completed order",
     "Order has items",
     steps("POST /api/v1/orders/:id/bill/"),
     "Response 201; bill returned with positive total amount",
     "", "", "Critical", "P1", ""),

    ("Orders", "TC-ORD-007", "Positive", "Pay order with cash",
     "Bill has been generated",
     steps("POST /api/v1/orders/:id/pay/ with payment_method='cash'"),
     "Response 200/201; order marked as paid",
     "", "", "Critical", "P1", ""),

    ("Orders", "TC-ORD-008", "Positive", "Pay order with card",
     "Bill has been generated",
     steps("POST /api/v1/orders/:id/pay/ with payment_method='card'"),
     "Response 200/201; order marked as paid",
     "", "", "High", "P1", ""),

    ("Orders", "TC-ORD-009", "Positive", "Filter orders by type=takeaway",
     "Both takeaway and dine-in orders exist",
     steps("GET /api/v1/orders/?type=takeaway"),
     "Response 200; all returned orders have type='takeaway'",
     "", "", "Medium", "P2", ""),

    ("Orders", "TC-ORD-010", "Positive", "Filter orders by status=pending",
     "Pending orders exist",
     steps("GET /api/v1/orders/?status=pending"),
     "Response 200; all returned orders have status='pending'",
     "", "", "Medium", "P2", ""),

    ("Orders", "TC-ORD-011", "Negative", "Create dine-in order without table",
     "User logged in",
     steps("POST /api/v1/orders/ with type='dine_in' and no table field"),
     "Response 400 — table is required for dine-in",
     "", "", "High", "P1", ""),

    ("Orders", "TC-ORD-012", "Negative", "Create takeaway order without customer name",
     "User logged in",
     steps("POST /api/v1/orders/ with type='takeaway' and no customer_name"),
     "Response 400 — customer_name is required for takeaway",
     "", "", "High", "P1", ""),

    ("Orders", "TC-ORD-013", "Negative", "Apply discount above 100%",
     "Bill exists",
     steps("PATCH /api/v1/orders/:id/bill/ with discount_percent=150"),
     "Response 400/422 — discount cannot exceed 100%",
     "", "", "Medium", "P2", ""),

    ("Orders", "TC-ORD-014", "Negative", "Update order with invalid status value",
     "Order exists",
     steps("PATCH /api/v1/orders/:id/ with status='invalid_xyz'"),
     "Response 400 — invalid status value",
     "", "", "High", "P1", "Known bug: API currently returns 200"),

    ("Orders", "TC-ORD-015", "Negative", "Add item to a completed/paid order",
     "Order is paid",
     steps("POST /api/v1/orders/:id/add_items/ on a paid order"),
     "Response 400/403 — cannot modify a completed order",
     "", "", "High", "P1", ""),

    ("Orders", "TC-ORD-016", "Negative", "Pay an already paid order",
     "Order is already paid",
     steps("POST /api/v1/orders/:id/pay/ again on a paid order"),
     "Response 400/409 — order already paid",
     "", "", "Medium", "P2", ""),

    # ─────────────────────────────────────────────────────────────────
    # 05  TABLES
    # ─────────────────────────────────────────────────────────────────
    ("Tables", "TC-TBL-001", "Positive", "View all tables",
     "User logged in; tables configured",
     steps("GET /api/v1/tables/"),
     "Response 200; list of tables with id, name, status, section",
     "", "", "High", "P1", ""),

    ("Tables", "TC-TBL-002", "Positive", "Open a table session",
     "Table is available",
     steps("POST /api/v1/tables/:id/open/"),
     "Response 200; table status changes to 'occupied'",
     "", "", "High", "P1", ""),

    ("Tables", "TC-TBL-003", "Positive", "Close a table session",
     "Table session is open and all orders are paid",
     steps("POST /api/v1/tables/:id/close/"),
     "Response 200; table status returns to 'available'",
     "", "", "High", "P1", ""),

    ("Tables", "TC-TBL-004", "Positive", "Filter tables by status=available",
     "Mix of available and occupied tables",
     steps("GET /api/v1/tables/?status=available"),
     "Response 200; all returned tables have status='available'",
     "", "", "Medium", "P2", ""),

    ("Tables", "TC-TBL-005", "Negative", "Create table without required section field",
     "User logged in",
     steps("POST /api/v1/tables/ with name='T1' and no section field"),
     "Response 400 — section is required",
     "", "", "High", "P1", ""),

    ("Tables", "TC-TBL-006", "Negative", "Open a table that is already occupied",
     "Table is already occupied",
     steps("POST /api/v1/tables/:id/open/ on occupied table"),
     "Response 400/409 — table is already in use",
     "", "", "Medium", "P2", ""),

    ("Tables", "TC-TBL-007", "Negative", "Close a table with an unpaid active order",
     "Table has an open order",
     steps("POST /api/v1/tables/:id/close/ while active order exists"),
     "Response 400 — settle all orders before closing table",
     "", "", "High", "P1", ""),

    # ─────────────────────────────────────────────────────────────────
    # 06  SETTINGS – RESTAURANT DETAILS
    # ─────────────────────────────────────────────────────────────────
    ("Settings – General", "TC-SET-001", "Positive", "Settings page loads for authenticated user",
     "User logged in",
     steps("Navigate to /settings"),
     "Page renders with Restaurant Details form and sidebar navigation",
     "", "", "High", "P1", ""),

    ("Settings – General", "TC-SET-002", "Positive", "Update restaurant name",
     "User logged in with admin rights",
     steps("Go to Settings > Restaurant Details", "Change restaurant name", "Save"),
     "Name updated; GET /restaurant/ returns new name",
     "", "", "High", "P1", ""),

    ("Settings – General", "TC-SET-003", "Positive", "Update currency symbol",
     "User logged in",
     steps("Go to Settings > Restaurant Details", "Change Currency Symbol to USD", "Save"),
     "Currency symbol updated to USD across the app",
     "", "", "Medium", "P2", ""),

    ("Settings – General", "TC-SET-004", "Positive", "Update restaurant type",
     "User logged in",
     steps("Go to Settings > Restaurant Details", "Select type 'Cafe'", "Save"),
     "Type saved; reflected in restaurant profile",
     "", "", "Low", "P3", ""),

    ("Settings – General", "TC-SET-005", "Negative", "Access settings without authentication",
     "No active session",
     steps("Visit /settings without login"),
     "Redirected to /login",
     "", "", "Critical", "P1", ""),

    # ─────────────────────────────────────────────────────────────────
    # 07  SETTINGS – TAX & RATES
    # ─────────────────────────────────────────────────────────────────
    ("Settings – Tax", "TC-TAX-001", "Positive", "View Tax & Rates settings page",
     "User logged in",
     steps("Go to Settings > Tax & Rates"),
     "Page renders with tax rate field",
     "", "", "High", "P1", ""),

    ("Settings – Tax", "TC-TAX-002", "Positive", "Update tax rate to 13%",
     "User logged in",
     steps("Go to Tax & Rates", "Set tax rate to 13", "Save"),
     "Tax rate saved as 13; reflected on future bills",
     "", "", "High", "P1", ""),

    ("Settings – Tax", "TC-TAX-003", "Positive", "Set tax rate to 0% (tax-exempt)",
     "User logged in",
     steps("Set tax rate to 0", "Save"),
     "Response 200; bills generated with 0 tax",
     "", "", "Medium", "P2", ""),

    ("Settings – Tax", "TC-TAX-004", "Negative", "Set tax rate to negative value",
     "User logged in",
     steps("Enter -5 in tax rate field", "Save"),
     "Validation error — tax rate cannot be negative",
     "", "", "High", "P1", ""),

    ("Settings – Tax", "TC-TAX-005", "Negative", "Set tax rate above 100%",
     "User logged in",
     steps("Enter 150 in tax rate field", "Save"),
     "Validation error — tax rate cannot exceed 100%",
     "", "", "High", "P1", ""),

    # ─────────────────────────────────────────────────────────────────
    # 08  INVOICE SETTINGS
    # ─────────────────────────────────────────────────────────────────
    ("Invoice Settings", "TC-INV-001", "Positive", "Invoice Setting page loads",
     "User logged in",
     steps("Go to Settings", "Click Invoice Setting in sidebar"),
     "Invoice Setting page renders with Restaurant Information and Invoice Heading Details sections",
     "", "", "High", "P1", ""),

    ("Invoice Settings", "TC-INV-002", "Positive", "Invoice Heading Details section is visible",
     "On Invoice Setting page",
     steps("Scroll to Invoice Heading Details"),
     "Toggle buttons for Horizontal, Show, Order Type, Include Number are visible",
     "", "", "Medium", "P2", ""),

    ("Invoice Settings", "TC-INV-003", "Positive", "Line Item Details section is visible",
     "On Invoice Setting page",
     steps("Scroll to Line Item Details"),
     "Toggle buttons for S.N, Particular, Rate, Qty, Amount are visible",
     "", "", "Medium", "P2", ""),

    ("Invoice Settings", "TC-INV-004", "Positive", "Invoice preview updates on toggle change",
     "On Invoice Setting page",
     steps("Toggle off 'Show' in Heading Details", "Observe preview panel"),
     "Invoice preview on the right updates to reflect the change",
     "", "", "Medium", "P2", ""),

    ("Invoice Settings", "TC-INV-005", "Positive", "GET /settings/ returns print_enabled field",
     "User logged in",
     steps("GET /api/v1/settings/"),
     "Response 200 with print_enabled boolean field",
     "", "", "High", "P1", ""),

    ("Invoice Settings", "TC-INV-006", "Positive", "GET /settings/ returns printing_mode field",
     "User logged in",
     steps("GET /api/v1/settings/"),
     "Response 200 with printing_mode string field",
     "", "", "High", "P1", ""),

    ("Invoice Settings", "TC-INV-007", "Positive", "PATCH print_enabled=true enables invoice printing",
     "User logged in",
     steps("PATCH /api/v1/settings/ with print_enabled=true"),
     "Response 200/204; GET /settings/ returns print_enabled=true",
     "", "", "High", "P1", ""),

    ("Invoice Settings", "TC-INV-008", "Positive", "PATCH print_enabled=false disables invoice printing",
     "print_enabled is currently true",
     steps("PATCH /api/v1/settings/ with print_enabled=false"),
     "Response 200/204; GET /settings/ returns print_enabled=false",
     "", "", "High", "P1", ""),

    ("Invoice Settings", "TC-INV-009", "Positive", "PATCH printing_mode to valid mode",
     "User logged in",
     steps("PATCH /api/v1/settings/ with printing_mode='auto'"),
     "Response 200/204; printing_mode persisted",
     "", "", "Medium", "P2", ""),

    ("Invoice Settings", "TC-INV-010", "Negative", "PATCH printing_mode with invalid value",
     "User logged in",
     steps("PATCH /api/v1/settings/ with printing_mode='xyz_invalid'"),
     "Response 400 — invalid printing_mode value",
     "", "", "Medium", "P2", ""),

    ("Invoice Settings", "TC-INV-011", "Negative", "Invoice Setting page without authentication",
     "No active session",
     steps("Visit /settings/invoice or click Invoice Setting without login"),
     "Redirected to /login",
     "", "", "Critical", "P1", ""),

    # ─────────────────────────────────────────────────────────────────
    # 09  KOT SETTINGS
    # ─────────────────────────────────────────────────────────────────
    ("KOT Settings", "TC-KOT-001", "Positive", "KOT Setting page loads",
     "User logged in",
     steps("Go to Settings", "Click KOT Setting in sidebar"),
     "KOT Setting page renders with KOT/printer-related fields",
     "", "", "High", "P1", ""),

    ("KOT Settings", "TC-KOT-002", "Positive", "KOT Setting page has save controls",
     "On KOT Setting page",
     steps("Inspect the KOT Setting form"),
     "Save or Update button is visible on the page",
     "", "", "High", "P1", ""),

    ("KOT Settings", "TC-KOT-003", "Positive", "Enable KOT printing",
     "On KOT Setting page; KOT is disabled",
     steps("Toggle KOT enabled on", "Save"),
     "KOT tickets generated when orders are placed",
     "", "", "High", "P1", ""),

    ("KOT Settings", "TC-KOT-004", "Positive", "Disable KOT printing",
     "On KOT Setting page; KOT is enabled",
     steps("Toggle KOT enabled off", "Save"),
     "KOT tickets no longer generated for new orders",
     "", "", "High", "P1", ""),

    ("KOT Settings", "TC-KOT-005", "Positive", "Assign kitchen printer to a food category via API",
     "Kitchen printer exists; food category exists",
     steps("PATCH /api/v1/menu/categories/:id/ with printer=<kitchen_printer_id>"),
     "Response 200/204; category assigned to kitchen printer",
     "", "", "High", "P1", ""),

    ("KOT Settings", "TC-KOT-006", "Positive", "Assign bar printer to a drink category via API",
     "Bar printer exists; drink category exists",
     steps("PATCH /api/v1/menu/categories/:id/ with printer=<bar_printer_id>"),
     "Response 200/204; category assigned to bar printer",
     "", "", "High", "P1", ""),

    ("KOT Settings", "TC-KOT-007", "Positive", "Food item routes to kitchen printer",
     "Food item and kitchen printer assigned",
     steps("Place order with a food item", "Check KOT output"),
     "KOT prints at kitchen printer for the food item",
     "", "", "High", "P1", ""),

    ("KOT Settings", "TC-KOT-008", "Positive", "Drink item routes to bar printer",
     "Drink item and bar printer assigned",
     steps("Place order with a drink item", "Check KOT output"),
     "KOT prints at bar printer for the drink item",
     "", "", "High", "P1", ""),

    ("KOT Settings", "TC-KOT-009", "Negative", "KOT Setting page without authentication",
     "No active session",
     steps("Visit /settings/kot or click KOT Setting without login"),
     "Redirected to /login",
     "", "", "Critical", "P1", ""),

    ("KOT Settings", "TC-KOT-010", "Negative", "Assign non-existent printer to category",
     "User logged in",
     steps("PATCH /api/v1/menu/categories/:id/ with printer=99999 (non-existent)"),
     "Response 400/404 — printer not found",
     "", "", "Medium", "P2", ""),

    # ─────────────────────────────────────────────────────────────────
    # 10  PRINTER SETTINGS
    # ─────────────────────────────────────────────────────────────────
    ("Printer Settings", "TC-PRN-001", "Positive", "Printer settings page loads",
     "User logged in",
     steps("Go to Settings", "Click Printer in sidebar"),
     "Printer page renders with printer list or Add Printer option",
     "", "", "High", "P1", ""),

    ("Printer Settings", "TC-PRN-002", "Positive", "Bar printer is listed",
     "Bar printer configured",
     steps("Go to Settings > Printer"),
     "'Main Bar Printer' visible in the printer list",
     "", "", "High", "P1", ""),

    ("Printer Settings", "TC-PRN-003", "Positive", "Kitchen printer is listed",
     "Kitchen printer configured",
     steps("Go to Settings > Printer"),
     "'Kitchen Printer' visible in the printer list",
     "", "", "High", "P1", ""),

    ("Printer Settings", "TC-PRN-004", "Positive", "GET /printers/ returns printer list",
     "User logged in",
     steps("GET /api/v1/printers/"),
     "Response 200; list of printers with id, name fields",
     "", "", "High", "P1", ""),

    ("Printer Settings", "TC-PRN-005", "Positive", "Assign item to kitchen printer via API",
     "Item and kitchen printer exist",
     steps("PATCH /api/v1/menu/items/:id/ with kitchen_printer=<printer_id>"),
     "Response 200/204; GET /menu/items/:id/ returns printer field set",
     "", "", "High", "P1", ""),

    ("Printer Settings", "TC-PRN-006", "Negative", "Printer page without authentication",
     "No active session",
     steps("Visit /settings without login", "Click Printer link"),
     "Redirected to /login",
     "", "", "Critical", "P1", ""),

    # ─────────────────────────────────────────────────────────────────
    # 11  BILLING & PAYMENTS
    # ─────────────────────────────────────────────────────────────────
    ("Billing", "TC-BILL-001", "Positive", "Generate bill for order with items",
     "Order has at least one item",
     steps("POST /api/v1/orders/:id/bill/"),
     "Response 200/201; bill with positive total amount",
     "", "", "Critical", "P1", ""),

    ("Billing", "TC-BILL-002", "Positive", "Bill total equals sum of item prices × qty",
     "Order has known items at known prices",
     steps("Generate bill", "GET /api/v1/orders/:id/bill/"),
     "total = sum(item.price × item.qty) + tax",
     "", "", "High", "P1", ""),

    ("Billing", "TC-BILL-003", "Positive", "Apply 10% discount to bill",
     "Bill generated",
     steps("PATCH /api/v1/orders/:id/bill/ with discount_percent=10"),
     "Response 200; discounted total = original_total × 0.90",
     "", "", "High", "P1", ""),

    ("Billing", "TC-BILL-004", "Positive", "Bill PDF / print preview renders",
     "Bill generated",
     steps("Navigate to order billing view in UI"),
     "Bill renders with restaurant name, items, totals, tax, and payment section",
     "", "", "Medium", "P2", ""),

    ("Billing", "TC-BILL-005", "Positive", "Paid order removed from pending queue",
     "Order paid",
     steps("Pay an order", "GET /api/v1/orders/?status=pending"),
     "Paid order is absent from the pending list",
     "", "", "High", "P1", ""),

    ("Billing", "TC-BILL-006", "Negative", "Apply discount of 150% — rejected",
     "Bill exists",
     steps("PATCH /api/v1/orders/:id/bill/ with discount_percent=150"),
     "Response 400/422 — discount cannot exceed 100%",
     "", "", "High", "P1", ""),

    ("Billing", "TC-BILL-007", "Negative", "Generate bill for order with no items",
     "Order exists with zero items",
     steps("POST /api/v1/orders/:id/bill/ on empty order"),
     "Response 400 — cannot bill an empty order",
     "", "", "Medium", "P2", ""),

    ("Billing", "TC-BILL-008", "Negative", "Pay order with invalid payment method",
     "Bill generated",
     steps("POST /api/v1/orders/:id/pay/ with payment_method='bitcoin'"),
     "Response 400 — unsupported payment method",
     "", "", "Medium", "P2", ""),

    # ─────────────────────────────────────────────────────────────────
    # 12  REPORTS
    # ─────────────────────────────────────────────────────────────────
    ("Reports", "TC-RPT-001", "Positive", "Sales report endpoint responds",
     "User logged in",
     steps("GET /api/v1/reports/sales/"),
     "Response 200 with sales data or 404 if not yet implemented",
     "", "", "Medium", "P2", ""),

    ("Reports", "TC-RPT-002", "Positive", "Popular items report endpoint responds",
     "User logged in",
     steps("GET /api/v1/reports/popular-items/"),
     "Response 200 with popular items list",
     "", "", "Medium", "P2", ""),

    ("Reports", "TC-RPT-003", "Positive", "Reports page renders without error",
     "User logged in",
     steps("Navigate to /reports"),
     "Page renders with report sections visible",
     "", "", "High", "P1", ""),

    ("Reports", "TC-RPT-004", "Negative", "Reports without authentication",
     "No active session",
     steps("Visit /reports without login"),
     "Redirected to /login",
     "", "", "High", "P1", ""),

    # ─────────────────────────────────────────────────────────────────
    # 13  STAFF MANAGEMENT
    # ─────────────────────────────────────────────────────────────────
    ("Staff", "TC-STF-001", "Positive", "View staff list",
     "User logged in with admin rights",
     steps("Navigate to Staff section"),
     "Staff list renders with names, roles, and contact details",
     "", "", "High", "P1", ""),

    ("Staff", "TC-STF-002", "Positive", "Add a new staff member",
     "Admin logged in",
     steps("Fill staff form with name, email, role", "Submit"),
     "Staff member created; appears in staff list",
     "", "", "High", "P1", ""),

    ("Staff", "TC-STF-003", "Positive", "Update staff role",
     "Staff member exists",
     steps("Open staff member", "Change role to Manager", "Save"),
     "Role updated; reflected in staff list",
     "", "", "Medium", "P2", ""),

    ("Staff", "TC-STF-004", "Positive", "Deactivate a staff account",
     "Staff member is active",
     steps("Open staff member", "Toggle active status off", "Save"),
     "Staff account deactivated; cannot login",
     "", "", "Medium", "P2", ""),

    ("Staff", "TC-STF-005", "Negative", "Add staff with duplicate email",
     "Staff with email already exists",
     steps("Submit staff form with existing email"),
     "Response 400/409 — email already registered",
     "", "", "High", "P1", ""),

    ("Staff", "TC-STF-006", "Negative", "Add staff with invalid email format",
     "Admin logged in",
     steps("Enter 'not-an-email' in email field", "Submit"),
     "Validation error — invalid email format",
     "", "", "Medium", "P2", ""),

    ("Staff", "TC-STF-007", "Negative", "Staff page without authentication",
     "No active session",
     steps("Visit staff management page without login"),
     "Redirected to /login",
     "", "", "High", "P1", ""),

    # ─────────────────────────────────────────────────────────────────
    # 14  SEARCH & FILTER
    # ─────────────────────────────────────────────────────────────────
    ("Search & Filter", "TC-SRH-001", "Positive", "Search orders by customer name",
     "Takeaway orders with known customer names exist",
     steps("GET /api/v1/orders/?search=<customer_name>"),
     "Response 200; returned orders match the searched name",
     "", "", "Medium", "P2", ""),

    ("Search & Filter", "TC-SRH-002", "Positive", "Filter orders by type=dine_in",
     "Dine-in orders exist",
     steps("GET /api/v1/orders/?type=dine_in"),
     "All returned orders have type='dine_in'",
     "", "", "Medium", "P2", ""),

    ("Search & Filter", "TC-SRH-003", "Positive", "Filter menu items by food_type=non_veg",
     "Non-veg items exist",
     steps("GET /api/v1/menu/items/?food_type=non_veg"),
     "Response 200; all returned items have food_type='non_veg'",
     "", "", "Medium", "P2", ""),

    ("Search & Filter", "TC-SRH-004", "Positive", "Search menu items by name keyword",
     "Items exist",
     steps("GET /api/v1/menu/items/?search=chicken"),
     "Response 200; items with 'chicken' in name returned",
     "", "", "Medium", "P2", ""),

    ("Search & Filter", "TC-SRH-005", "Negative", "Filter with unknown status value",
     "Orders exist",
     steps("GET /api/v1/orders/?status=flying"),
     "Response 400 — invalid status filter value",
     "", "", "Low", "P3", ""),

    ("Search & Filter", "TC-SRH-006", "Negative", "Search with SQL injection attempt",
     "User logged in",
     steps("GET /api/v1/menu/items/?search=' OR 1=1 --"),
     "Response 200 with 0 or filtered results; no SQL error; no data leak",
     "", "", "Critical", "P1", "Security test"),

    # ─────────────────────────────────────────────────────────────────
    # 15  SECURITY
    # ─────────────────────────────────────────────────────────────────
    ("Security", "TC-SEC-001", "Positive", "API base URL enforces HTTPS",
     "App deployed",
     steps("Check API base URL"),
     "URL starts with https:// — all traffic encrypted",
     "", "", "Critical", "P1", ""),

    ("Security", "TC-SEC-002", "Positive", "CORS policy restricts unknown origins",
     "App deployed",
     steps("Send API request from an unauthorized origin"),
     "CORS headers absent or restricted; browser blocks cross-origin request",
     "", "", "High", "P1", ""),

    ("Security", "TC-SEC-003", "Negative", "Stack trace not exposed in error responses",
     "User logged in",
     steps("Trigger a server-side error (e.g. malformed JSON body)"),
     "Response 4xx/5xx with user-friendly message; no Python traceback in body",
     "", "", "High", "P1", ""),

    ("Security", "TC-SEC-004", "Negative", "XSS attempt in order note field",
     "User logged in",
     steps("Create order with note='<script>alert(1)</script>'",
           "Open order detail page"),
     "Script is escaped/sanitized; no alert box executes",
     "", "", "High", "P1", "Security test"),

    ("Security", "TC-SEC-005", "Negative", "Unauthenticated API request returns 401",
     "No token",
     steps("GET /api/v1/orders/ with no Authorization header"),
     "Response 401 Unauthorized with JSON error",
     "", "", "Critical", "P1", ""),

    # ─────────────────────────────────────────────────────────────────
    # 16  PERFORMANCE & RELIABILITY
    # ─────────────────────────────────────────────────────────────────
    ("Performance", "TC-PERF-001", "Positive", "Dashboard loads within 3 seconds",
     "User logged in; normal network",
     steps("Navigate to /overview", "Measure page load time"),
     "Page fully interactive in < 3 000 ms",
     "", "", "Medium", "P2", ""),

    ("Performance", "TC-PERF-002", "Positive", "Order list page loads within 3 seconds",
     "50+ orders exist",
     steps("Navigate to /orders", "Measure time to render order list"),
     "List rendered in < 3 000 ms",
     "", "", "Medium", "P2", ""),

    ("Performance", "TC-PERF-003", "Positive", "API response time under 2 seconds for standard GETs",
     "Normal load",
     steps("GET /api/v1/orders/", "GET /api/v1/menu/items/"),
     "Each response received in < 2 000 ms",
     "", "", "Medium", "P2", ""),

    ("Performance", "TC-PERF-004", "Negative", "App handles network timeout gracefully",
     "Simulated network latency > 30 s",
     steps("Throttle network", "Attempt to load orders page"),
     "Loading spinner shown; timeout error message displayed — no blank screen",
     "", "", "Medium", "P2", ""),

]

# ── Write CSV ─────────────────────────────────────────────────────────────────
with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f, quoting=csv.QUOTE_ALL)
    writer.writerow(HEADERS)

    sn = 1
    for row in CASES:
        module, tc_id, tc_type, title, precond, test_steps, expected, actual, status, severity, priority, remarks = row
        writer.writerow([
            sn, module, tc_id, tc_type, title,
            precond, test_steps, expected,
            actual, status, severity, priority, remarks,
        ])
        sn += 1

total    = len(CASES)
positive = sum(1 for r in CASES if r[2] == "Positive")
negative = total - positive
print(f"✅  CSV saved → {OUTPUT}")
print(f"   Total test cases : {total}")
print(f"   Positive         : {positive}")
print(f"   Negative         : {negative}")
print(f"\nImport into Google Sheets:")
print(f"  File > Import > Upload > {OUTPUT.name}")
print(f"  Separator: Comma | Convert text to numbers: No")

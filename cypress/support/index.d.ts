/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    // ── Auth ───────────────────────────────────────────────────────────────────

    /** Visit a page and assert body is visible */
    visitPage(path: string): Chainable<void>;

    /** Send login OTP to identifier */
    sendOtp(identifier: string, method?: 'email' | 'sms'): Chainable<Response<any>>;

    /** Verify OTP and store token in localStorage */
    verifyOtp(identifier: string, code: string, method?: 'email' | 'sms'): Chainable<any>;

    /** Inject an existing access token directly into localStorage */
    setAuthToken(token: string): Chainable<void>;

    /** Full OTP login — uses cached token, OTP_CODE env, or interactive terminal prompt */
    loginViaApi(identifier?: string, otpCode?: string): Chainable<void>;

    /** Remove tokens from localStorage and redirect to /login */
    logout(): Chainable<void>;

    /** Clear all cookies, localStorage, and sessionStorage */
    clearAuth(): Chainable<void>;

    // ── Signup ─────────────────────────────────────────────────────────────────

    /** Send signup OTP */
    signupSendOtp(identifier: string, method?: 'email' | 'sms'): Chainable<Response<any>>;

    /** Verify signup OTP and store token */
    signupVerifyOtp(identifier: string, code: string, method?: 'email' | 'sms'): Chainable<any>;

    // ── Core API ───────────────────────────────────────────────────────────────

    /** Authenticated HTTP request — throws if no token is available */
    apiRequest(method: string, endpoint: string, body?: object): Chainable<Response<any>>;

    // ── User Profile ───────────────────────────────────────────────────────────

    /** GET /auth/me/ — current user profile */
    getMyProfileViaApi(): Chainable<Response<any>>;

    /** PATCH /auth/me/ — update profile fields */
    updateMyProfileViaApi(fields: object): Chainable<Response<any>>;

    /** POST /auth/logout/ — invalidate server session */
    logoutViaApi(): Chainable<Response<any>>;

    /** POST /auth/change-password/ */
    changePasswordViaApi(payload: object): Chainable<Response<any>>;

    // ── Settings ───────────────────────────────────────────────────────────────

    /** GET /settings/ */
    getSettingsViaApi(): Chainable<Response<any>>;

    /** PATCH /settings/ */
    updateSettingsViaApi(fields: object): Chainable<Response<any>>;

    /** GET /settings/profile/ — restaurant profile */
    getRestaurantProfileViaApi(): Chainable<Response<any>>;

    /** PATCH /settings/profile/ */
    updateRestaurantProfileViaApi(fields: object): Chainable<Response<any>>;

    /** GET /restaurant/ */
    getRestaurantInfoViaApi(): Chainable<Response<any>>;

    // ── Reports ────────────────────────────────────────────────────────────────

    /** GET /reports/sales/?period=<period> (omit period for all-time) */
    getSalesReportViaApi(period?: 'today' | 'week' | 'month'): Chainable<Response<any>>;

    /** GET /reports/orders/ */
    getOrdersReportViaApi(): Chainable<Response<any>>;

    /** GET /reports/popular-items/ */
    getPopularItemsReportViaApi(): Chainable<Response<any>>;

    /** GET /reports/summary/ */
    getReportsSummaryViaApi(): Chainable<Response<any>>;

    /** GET /dashboard/ */
    getDashboardViaApi(): Chainable<Response<any>>;

    /** GET /overview/ */
    getOverviewViaApi(): Chainable<Response<any>>;

    // ── Menu ───────────────────────────────────────────────────────────────────

    /** POST /menu/menus/ */
    createMenuViaApi(name: string, description?: string): Chainable<Response<any>>;

    /** GET /menu/menus/ */
    getMenusViaApi(): Chainable<Response<any>>;

    /** DELETE /menu/menus/:id/ */
    deleteMenuViaApi(menuId: number): Chainable<Response<any>>;

    /** POST /menu/categories/ */
    createCategoryViaApi(name: string): Chainable<Response<any>>;

    /** GET /menu/categories/ */
    getCategoriesViaApi(): Chainable<Response<any>>;

    /** DELETE /menu/categories/:id/ */
    deleteCategoryViaApi(categoryId: number): Chainable<Response<any>>;

    /** POST /menu/items/ */
    createItemViaApi(name: string, base_price: string, food_type?: 'veg' | 'non_veg'): Chainable<Response<any>>;

    /** GET /menu/items/?<params> */
    getItemsViaApi(params?: Record<string, string | number>): Chainable<Response<any>>;

    /** DELETE /menu/items/:id/ */
    deleteItemViaApi(itemId: number): Chainable<Response<any>>;

    /** GET /menu/customization-groups/ */
    getCustomizationGroupsViaApi(): Chainable<Response<any>>;

    // ── Orders ─────────────────────────────────────────────────────────────────

    /** POST /orders/ — creates dine_in (if tableId given) or takeaway */
    createOrderViaApi(tableId?: number | null, items?: object[], note?: string): Chainable<Response<any>>;

    /** GET /orders/?<params> */
    getOrdersViaApi(params?: Record<string, string | number>): Chainable<Response<any>>;

    /** GET /orders/?status=<status> */
    getOrdersByStatusViaApi(status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'paid'): Chainable<Response<any>>;

    /** GET /orders/?type=<type> */
    getOrdersByTypeViaApi(type: 'dine_in' | 'takeaway'): Chainable<Response<any>>;

    /** PATCH /orders/:id/ {status} */
    updateOrderStatusViaApi(orderId: number, status: string): Chainable<Response<any>>;

    /** POST /orders/:id/add_items/ */
    addItemToOrderViaApi(orderId: number, itemId: number, quantity?: number): Chainable<Response<any>>;

    /** POST /orders/:id/bill/ */
    generateBillViaApi(orderId: number): Chainable<Response<any>>;

    /** PATCH /orders/:id/ {status: 'cancelled'} */
    cancelOrderViaApi(orderId: number): Chainable<Response<any>>;

    /** DELETE /orders/:id/ */
    deleteOrderViaApi(orderId: number): Chainable<Response<any>>;

    /** PATCH /orders/:id/ {status: 'paid'} */
    markOrderPaidViaApi(orderId: number): Chainable<Response<any>>;

    // ── Tables ─────────────────────────────────────────────────────────────────

    /** GET /tables/?<params> */
    getTablesViaApi(params?: Record<string, string>): Chainable<Response<any>>;

    /** GET /tables/sections/ */
    getTableSectionsViaApi(): Chainable<Response<any>>;

    /** POST /tables/ */
    createTableViaApi(name: string, sectionId: string, capacity?: number): Chainable<Response<any>>;

    /** DELETE /tables/:id/ */
    deleteTableViaApi(tableId: number): Chainable<Response<any>>;

    /** POST /tables/:id/open/ */
    openTableViaApi(tableId: number): Chainable<Response<any>>;

    /** POST /tables/:id/close/ */
    closeTableViaApi(tableId: number): Chainable<Response<any>>;

    /** PATCH /tables/:id/ */
    updateTableStatusViaApi(tableId: number, status: string): Chainable<Response<any>>;

    // ── Printers ───────────────────────────────────────────────────────────────

    /** GET /printers/ */
    getPrintersViaApi(): Chainable<Response<any>>;

    // ── Navigation ─────────────────────────────────────────────────────────────

    /** Navigate to /overview */
    goToDashboard(): Chainable<void>;

    /** Navigate to /reports */
    goToReports(): Chainable<void>;

    /** Navigate to /menu */
    goToMenuPage(): Chainable<void>;

    /** Navigate to /orders */
    goToOrders(): Chainable<void>;

    /** Navigate to /tables */
    goToTables(): Chainable<void>;

    /** Navigate to /settings */
    goToSettings(): Chainable<void>;

    /** Navigate to /profile */
    goToProfile(): Chainable<void>;

    /** Navigate to /login */
    goToLogin(): Chainable<void>;

    /** Navigate to /signup */
    goToSignup(): Chainable<void>;

    // ── UI Helpers ─────────────────────────────────────────────────────────────

    /** Click a sidebar/nav link by exact label (case-insensitive) */
    clickSidebarLink(label: string): Chainable<void>;

    /** Wait for spinners/skeletons to disappear before continuing */
    waitForPageLoad(): Chainable<void>;

    /** Wait for an intercepted API call and assert 2xx response */
    waitForApiResponse(alias: string): Chainable<void>;

    /** Assert zero console errors on the current page */
    assertNoConsoleErrors(): Chainable<void>;

    /** Click a profile tab by name (Personal Info, Security, Preferences, etc.) */
    switchProfileTab(tabName: string): Chainable<void>;
  }
}

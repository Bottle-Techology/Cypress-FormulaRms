/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /** Visit a page and assert body is visible */
    visitPage(path: string): Chainable<void>;

    /** Send OTP to the given identifier */
    sendOtp(identifier: string, method?: 'email' | 'sms'): Chainable<Response<any>>;

    /** Send signup OTP to a new identifier */
    signupSendOtp(identifier: string, method?: 'email' | 'sms'): Chainable<Response<any>>;

    /** Verify signup OTP and store token in localStorage */
    signupVerifyOtp(identifier: string, code: string, method?: 'email' | 'sms'): Chainable<any>;

    /** Verify OTP and store token in localStorage */
    verifyOtp(identifier: string, code: string, method?: 'email' | 'sms'): Chainable<any>;

    /** Inject an existing access token into localStorage */
    setAuthToken(token: string): Chainable<void>;

    /** Authenticate via OTP (requires OTP_CODE env or cached token) */
    loginViaApi(identifier?: string, otpCode?: string): Chainable<void>;

    /** Log out and navigate to /login */
    logout(): Chainable<void>;

    /** Clear all cookies, localStorage, and sessionStorage */
    clearAuth(): Chainable<void>;

    /** Make an authenticated API request using the stored token */
    apiRequest(method: string, endpoint: string, body?: object): Chainable<Response<any>>;

    /** Create a menu via API */
    createMenuViaApi(name: string, description?: string): Chainable<void>;

    /** Create a category via API */
    createCategoryViaApi(name: string): Chainable<void>;

    /** Create an item via API */
    createItemViaApi(name: string, base_price: string, food_type?: 'veg' | 'non_veg'): Chainable<void>;

    /** Create an order via API (tableId optional) */
    createOrderViaApi(tableId?: number | null, items?: object[], note?: string): Chainable<Response<any>>;

    /** Update an order's status via API */
    updateOrderStatusViaApi(orderId: number, status: string): Chainable<Response<any>>;

    /** Add an item to an existing order via API */
    addItemToOrderViaApi(orderId: number, itemId: number, quantity?: number): Chainable<Response<any>>;

    /** Generate a bill for an order via API */
    generateBillViaApi(orderId: number): Chainable<Response<any>>;

    /** Open a table (mark as occupied) via API */
    openTableViaApi(tableId: number): Chainable<Response<any>>;

    /** Close a table (mark as available) via API */
    closeTableViaApi(tableId: number): Chainable<Response<any>>;

    /** Update a table status via API */
    updateTableStatusViaApi(tableId: number, status: string): Chainable<Response<any>>;

    /** Navigate to the /overview dashboard */
    goToDashboard(): Chainable<void>;

    /** Navigate to the /reports page */
    goToReports(): Chainable<void>;

    /** Navigate to the /menu page */
    goToMenuPage(): Chainable<void>;

    /** Navigate to the /orders page */
    goToOrders(): Chainable<void>;

    /** Navigate to the /tables page */
    goToTables(): Chainable<void>;

    /** Navigate to the /settings page */
    goToSettings(): Chainable<void>;

    /** Click a sidebar/nav link by label */
    clickSidebarLink(label: string): Chainable<void>;

    /** Wait for page to finish loading (no spinners/skeletons) */
    waitForPageLoad(): Chainable<void>;
  }
}

# FormulaRMS — Cypress Test Report
**Date:** 2026-05-08  
**Environment:** https://formularms.bottle.com.np  
**API:** https://formularms-api.bottle.com.np/api/v1  
**Cypress:** 13.17.0 · Electron 118 (headless)  
**Total Specs:** 28 · **Tests:** 489 · **Passing:** 344 · **Failing:** 137 · **Pass Rate:** 70%

---

## Summary

| Spec | Tests | Pass | Fail | Status |
|---|---|---|---|---|
| 01-signup | 14 | 6 | 4 | ✖ |
| 02-homepage | 10 | 3 | 7 | ✖ |
| 03-auth | 12 | 10 | 1 | ✖ |
| 04-menu | 10 | 6 | 4 | ✖ |
| 05-categories | 11 | 5 | 6 | ✖ |
| 06-items | 17 | 11 | 6 | ✖ |
| 07-orders | 13 | 7 | 6 | ✖ |
| 08-tables | 15 | 9 | 6 | ✖ |
| 09-settings | 8 | 6 | 2 | ✖ |
| 10-responsive | 26 | 26 | 0 | ✔ |
| 11-console-errors | 8 | 8 | 0 | ✔ |
| 12-e2e-flow | 11 | 8 | 3 | ✖ |
| 13-dashboard | 14 | 11 | 3 | ✖ |
| 14-order-lifecycle | 17 | 13 | 4 | ✖ |
| 15-billing | 10 | 8 | 2 | ✖ |
| 16-table-sessions | 14 | 12 | 2 | ✖ |
| 17-search-filter | 20 | 16 | 4 | ✖ |
| 18-api-health | 17 | 12 | 5 | ✖ |
| 19-permissions | 21 | 3 | 18 | ✖ |
| 20-network-errors | 10 | 9 | 1 | ✖ |
| 21-accessibility | 14 | 8 | 6 | ✖ |
| 22-security | 18 | 12 | 6 | ✖ |
| 23-reports | 13 | 13 | 0 | ✔ |
| 24-performance | 15 | 15 | 0 | ✔ |
| 25-menu-availability | 12 | 7 | 2 | ✖ |
| 26-full-flow | 66 | 49 | 17 | ✖ |
| 27-regression | 39 | 26 | 13 | ✖ |
| 28-staff | 34 | 25 | 9 | ✖ |

---

## Bugs Found

---

### BUG-01 · Unauthenticated users not redirected to /login
**Severity:** High  
**Specs affected:** 01-signup, 02-homepage, 04-menu, 05-categories, 09-settings, 13-dashboard, 22-security  
**Failures:** 15+

**Description:**  
Multiple specs expect that visiting a protected route while unauthenticated triggers a redirect to `/login`. The app instead stays on `/` (root) or the originally visited URL with no redirect.

**Error:**
```
AssertionError: Timed out retrying after 10000ms:
  expected 'https://formularms.bottle.com.np/' to include '/login'
```

**Recommended Fix:**  
Add a route guard in the frontend that checks for a valid auth token on every protected route. If no token is found, redirect to `/login`. Example for React Router:
```js
function PrivateRoute({ children }) {
  const token = localStorage.getItem('access_token')
  return token ? children : <Navigate to="/login" replace />
}
```

---

### BUG-02 · Signup API endpoint returns 404
**Severity:** High  
**Spec affected:** 01-signup  
**Failures:** 3

**Description:**  
Tests calling `POST /auth/signup/send-otp/` receive HTTP 404. The signup endpoint is either not implemented, removed, or registered under a different route.

**Error:**
```
AssertionError: expected 404 to be one of [ 400, 422 ]   // invalid email test
AssertionError: expected 404 to be one of [ 200, 201, 400, 409 ]  // valid identifier test
```

**Recommended Fix:**  
Implement or restore the signup endpoint:
```
POST /auth/signup/send-otp/
Body: { identifier: "email@example.com", method: "email" }
Returns: 200 on success, 400/422 on validation error, 409 if already registered
```
If the app is invite-only, update the test to skip or assert 404 is expected.

---

### BUG-03 · Signup page does not redirect authenticated users
**Severity:** Medium  
**Spec affected:** 01-signup  
**Failures:** 1

**Description:**  
When an already-authenticated user visits `/signup`, the test expects a redirect away from the signup page. The app keeps the user on `/signup` instead.

**Error:**
```
AssertionError: Timed out retrying after 10000ms:
  expected 'https://formularms.bottle.com.np/signup' to not include '/signup'
```

**Recommended Fix:**  
Add a guard on the signup route that redirects already-authenticated users to `/` or `/dashboard`:
```js
if (isAuthenticated) return <Navigate to="/" replace />
```

---

### BUG-04 · OTP verify endpoint rate-limited (429) during test run
**Severity:** Medium  
**Spec affected:** 03-auth  
**Failures:** 1

**Description:**  
`03-auth.cy.js` makes a direct call to `POST /auth/login/verify-otp/` to test that it returns 200. By the time this spec runs, the OTP has already been consumed by the Cypress session setup (`loginViaApi`). The third retry also gets rate-limited (429).

**Error:**
```
AssertionError: expected 429 to equal 200
```

**Recommended Fix:**  
Update the test to check for the cached token first and skip re-verification if already authenticated:
```js
cy.task('getToken').then(cached => {
  if (cached) { cy.log('Using cached token'); return }
  // proceed with OTP verification
})
```

---

### BUG-05 · Multiple API endpoints return 404 (routing or auth issue)
**Severity:** High  
**Specs affected:** 04-menu, 05-categories, 06-items, 07-orders, 08-tables, 12-e2e-flow, 13-dashboard, 14-order-lifecycle, 15-billing, 16-table-sessions, 17-search-filter, 18-api-health, 25-menu-availability, 26-full-flow, 27-regression  
**Failures:** 70+

**Description:**  
A large number of API calls return HTTP 404 with an HTML "Not Found" body. This affects GET, POST, PATCH, and DELETE across menu, category, item, order, table, and billing endpoints. The HTML 404 body (`<!doctype html><html>...Not Found...`) confirms the requests are hitting a web server, not the API — suggesting the API base URL or routing is misconfigured for those test calls, or the API gateway is not routing requests correctly.

**Errors (sample):**
```
AssertionError: expected 404 to equal 200        // GET /menu/menus/:id/
AssertionError: expected 404 to be one of [ 200, 201 ]   // POST /menu/categories/
Expected array or paginated results: expected '<!doctype html>...' to satisfy [Function]
```

**Recommended Fix:**  
1. Verify `API_BASE` in `cypress.config.js` matches the live API base exactly:
   ```
   API_BASE: 'https://formularms-api.bottle.com.np/api/v1'
   ```
2. Ensure the API gateway routes `/api/v1/menu/`, `/api/v1/orders/`, `/api/v1/tables/` etc. correctly.
3. Check if the token is being passed in the `Authorization` header for these calls — 404 from a gateway can sometimes mean an auth middleware is redirecting to a 404 page instead of returning 401.

---

### BUG-06 · Login page UI elements not found
**Severity:** Medium  
**Spec affected:** 02-homepage  
**Failures:** 3

**Description:**  
Tests expect to find an `<input>` element on the homepage/login page for identifier entry, but the element is not present. This follows directly from BUG-01 — because the user is not redirected to `/login`, the login form is never rendered.

**Error:**
```
AssertionError: Timed out retrying after 10000ms:
  Expected to find element: `input`, but never found it.
```

**Recommended Fix:**  
Resolve BUG-01 first. Once the redirect to `/login` works, the input elements should be reachable. If the login page uses a non-standard input (e.g. `[data-testid="identifier"]`), update the selector in the test.

---

### BUG-07 · Settings page — save/submit button not found
**Severity:** Low  
**Spec affected:** 09-settings  
**Failures:** 1

**Description:**  
The settings page test looks for a save/update/submit button using the pattern `/save|update|submit/i` but cannot find it, suggesting the button is either missing, has an unexpected label, or the page does not load correctly.

**Error:**
```
AssertionError: Timed out retrying after 10000ms:
  Expected to find content: '/save|update|submit/i' but never did.
```

**Recommended Fix:**  
Ensure the settings form has a clearly labelled submit button. If it exists under a different label (e.g. "Apply", "Confirm"), update the test regex or add a `data-testid="settings-save"` attribute.

---

### BUG-08 · Permission tests: majority failing (18/21)
**Severity:** High  
**Spec affected:** 19-permissions  
**Failures:** 18

**Description:**  
Only 3 of 21 permission tests pass. This strongly suggests the role/permission system is either not configured, the test users don't have the expected roles assigned, or the permission-check endpoints don't exist.

**Recommended Fix:**  
1. Ensure test users with different roles (admin, staff, viewer) exist in the system.
2. Seed role assignments before the permission tests run.
3. Verify the permission-enforcement middleware is active on all relevant endpoints.

---

### BUG-09 · Accessibility — img elements and heading tags not found
**Severity:** Medium  
**Spec affected:** 21-accessibility  
**Failures:** 5

**Description:**  
Accessibility tests look for `<img>` elements and heading tags (`h1`, `h2`, `h3`) on the main pages but cannot find them. This may indicate pages are rendering without semantic HTML structure or images are loaded as CSS backgrounds (which FormulaRMS does for item/category images) rather than `<img>` tags.

**Error:**
```
AssertionError: Expected to find element: `img`, but never found it.
AssertionError: Expected to find element: `h1, h2, h3`, but never found it.
```

**Recommended Fix:**  
1. For images: the app uses CSS `background-image` for item cards. Add `<img>` tags with `alt` attributes where semantically appropriate, or update the test to check for `[style*="background-image"]` instead.
2. For headings: add proper `<h1>` or `<h2>` elements to page headers for accessibility compliance.

---

### BUG-10 · Security — session token too short
**Severity:** High  
**Spec affected:** 28-staff, 22-security  
**Failures:** 2

**Description:**  
Tests validating that the JWT/access token has a meaningful length (> 20 characters) receive a token of length 4 — specifically the string `"null"` serialized to string, meaning `localStorage.getItem('access_token')` returned `null` and was coerced to the string `"null"`.

**Error:**
```
AssertionError: expected 4 to be above 20
AssertionError: expected 'null' to have a length above 20 but got 4
```

**Recommended Fix:**  
Ensure `loginViaApi` stores the token under the key the test is reading. Check the key used:
```js
// In loginViaApi / cy.session:
window.localStorage.setItem('access_token', token)
// vs what the test reads:
localStorage.getItem('access_token')
```
If the app stores the token under a different key (e.g. `token`, `authToken`, `FORMULARMS_TOKEN`), align the test's key lookup.

---

### BUG-11 · Table status labels not rendered
**Severity:** Low  
**Specs affected:** 08-tables, 16-table-sessions  
**Failures:** 2

**Description:**  
Tests look for table status text (`available`, `occupied`, `reserved`, `free`) on the tables page but the labels are not found, suggesting the table status is shown differently (e.g. via colour badge only, icon, or different text).

**Error:**
```
AssertionError: Timed out retrying after 10000ms:
  Expected to find content: '/available|occupied|reserved|free/i' but never did.
```

**Recommended Fix:**  
Add visible text labels to table status badges, or add `data-testid="table-status"` attributes with the status value, and update the test selector accordingly.

---

### BUG-12 · Add/Create category button not found on menu page
**Severity:** Low  
**Spec affected:** 05-categories  
**Failures:** 1

**Description:**  
The test looks for a button or link matching `/add|create|new category/i` on the categories page but cannot find it.

**Error:**
```
AssertionError: Timed out retrying after 10000ms:
  Expected to find content: '/add|create|new category/i' but never did.
```

**Recommended Fix:**  
Ensure the "Add Category" / "Create Category" button is rendered and visible on the `/menu/categories` page. If the button label differs (e.g. "New", "+"), update the test regex to match.

---

### BUG-13 · API accepts negative and zero item prices
**Severity:** Medium  
**Spec affected:** 06-items  
**Failures:** 0 (soft-assert — test logs warning but does not fail)

**Description:**  
`POST /menu/items/` with `base_price: -10.00` or `base_price: 0.00` returns HTTP 201. The backend lacks `MinValueValidator` on the price field, allowing items with invalid prices to be created.

**Error:**
```
⚠ BUG ACTIVE: negative price accepted with 201 — add MinValueValidator(0.01)
⚠ BUG ACTIVE: price=0 accepted with 201
```

**Recommended Fix:**  
Add `MinValueValidator(0.01)` to the `base_price` field in the Django serializer:
```python
base_price = serializers.DecimalField(
    max_digits=10, decimal_places=2,
    validators=[MinValueValidator(Decimal('0.01'))]
)
```

---

### BUG-14 · PATCH /orders/:id/ accepts invalid status values
**Severity:** Medium  
**Spec affected:** 07-orders  
**Failures:** 0 (soft-assert — test logs warning but does not fail)

**Description:**  
`PATCH /orders/:id/` with `status: 'invalid_status_xyz'` returns HTTP 200 instead of 400. The API applies no enum validation on the `status` field, so any string is accepted.

**Error:**
```
⚠ BUG ACTIVE: invalid status accepted with 200 — backend must validate status enum
```

**Recommended Fix:**  
Add choices validation on the `status` field in the Django serializer:
```python
status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)
```

---

### BUG-15 · food_type filter returns mixed results
**Severity:** Medium  
**Spec affected:** 17-search-filter  
**Failures:** 0 (soft-assert — test logs warning but does not fail)

**Description:**  
`GET /menu/items/?food_type=veg` returns non-veg items in the result set. The filter is accepted (returns 200) but is not accurately applied, likely due to a missing `filter_backends` registration, DISTINCT issue with a variant JOIN, or ORM misconfiguration.

**Recommended Fix:**  
1. Ensure `DjangoFilterBackend` is in `filter_backends` for `MenuItemViewSet`.
2. Add `filterset_fields = ['food_type']` or a custom `FilterSet`.
3. If items have variants with different food types, add `DISTINCT` to the queryset.

---

### BUG-16 · ordering query param ignored on item list
**Severity:** Low  
**Spec affected:** 17-search-filter  
**Failures:** 0 (soft-assert — test logs warning but does not fail)

**Description:**  
`GET /menu/items/?ordering=base_price` returns 200 but results are not sorted by price. The `OrderingFilter` is either not applied in `MenuItemViewSet` or `base_price` is not in `ordering_fields`.

**Recommended Fix:**  
```python
class MenuItemViewSet(viewsets.ModelViewSet):
    filter_backends = [..., OrderingFilter]
    ordering_fields = ['base_price', 'name', 'created_at']
    ordering = ['name']
```

---

### BUG-17 · Pagination limit param not respected
**Severity:** Low  
**Spec affected:** 17-search-filter  
**Failures:** 0 (soft-assert — test logs warning but does not fail)

**Description:**  
`GET /menu/items/?limit=2` returns more than 2 items. The `limit` query param is ignored, indicating the pagination class does not support client-controlled page sizes.

**Recommended Fix:**  
Use `PageNumberPagination` with `page_size_query_param`:
```python
class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100
```

---

### BUG-18 · /menu/items/:id/reorder/ returns 405 (action not implemented)
**Severity:** Low  
**Spec affected:** 06-items  
**Failures:** 0 (soft-assert)

**Description:**  
`POST /menu/items/:id/reorder/` returns 405 (Method Not Allowed). The URL is registered but the action handler is missing in `MenuItemViewSet`.

**Recommended Fix:**  
```python
@action(detail=True, methods=['post'])
def reorder(self, request, pk=None):
    # update display_order for item
```

---

### BUG-19 · /menu/customization-groups/:id/toggle/ returns 405
**Severity:** Low  
**Spec affected:** 06-items  
**Failures:** 0 (soft-assert)

**Description:**  
`POST /menu/customization-groups/:id/toggle/` returns 405. The `toggle` action is not registered in `CustomizationGroupViewSet`.

**Recommended Fix:**  
```python
@action(detail=True, methods=['post'])
def toggle(self, request, pk=None):
    group = self.get_object()
    group.is_active = not group.is_active
    group.save()
    return Response({'is_active': group.is_active})
```

---

### BUG-20 · Unauthenticated API requests return 404 instead of 401
**Severity:** High  
**Spec affected:** 19-permissions  
**Failures:** 18

**Description:**  
API endpoints return 404 (HTML not found) instead of 401/403 when no token is provided. In a multi-tenant setup, the tenant cannot be resolved without a token, so the request hits a 404 route before even reaching the auth middleware. This is why 18/21 permission tests fail — they expect 401/403 but receive 404.

**Error:**
```
AssertionError: expected 404 to be one of [ 401, 403 ]
```

**Recommended Fix:**  
Return 401 from the authentication middleware before tenant resolution fails. Alternatively, ensure unauthenticated requests to `/api/v1/*` always return `{"detail": "Authentication credentials were not provided."}` with status 401.

---

### BUG-21 · POST /tables/ silently requires undocumented section field
**Severity:** Medium  
**Spec affected:** 08-tables, 16-table-sessions  
**Failures:** 2+

**Description:**  
`POST /tables/` returns 400 when the `section` field is omitted, but the error message is not descriptive. Tests that try to create tables without knowing the section UUID fail silently. No documentation or API response indicates this field is required.

**Recommended Fix:**  
1. Return a clear error: `{"section": ["This field is required."]}`.
2. Document the field requirement in API docs.
3. Alternatively, auto-assign a default section if the tenant has only one section.

---

## Passing Specs (No Action Required)

| Spec | Tests | Notes |
|---|---|---|
| 10-responsive | 26/26 | All viewport/breakpoint checks pass |
| 11-console-errors | 8/8 | No JS console errors on main pages |
| 23-reports | 13/13 | Report endpoints respond correctly |
| 24-performance | 15/15 | Page load times within thresholds |

---

## Recommended Fix Priority

| Priority | Bug | Impact |
|---|---|---|
| P1 | BUG-05 — API endpoints returning 404 | 70+ test failures across 15 specs |
| P1 | BUG-20 — Unauthenticated API returns 404 not 401 | 18/21 permission tests failing |
| P1 | BUG-01 — No redirect to /login for unauthenticated users | Security + 15 cascading failures |
| P2 | BUG-02 — Signup API 404 | Signup flow untestable |
| P2 | BUG-10 — Token stored under wrong key | Auth state not persisting |
| P2 | BUG-08 — Permission tests 18/21 failing | Root cause is BUG-20 |
| P2 | BUG-13 — Negative/zero prices accepted | Data integrity risk |
| P2 | BUG-14 — Invalid order status accepted | Data integrity risk |
| P2 | BUG-21 — Table creation requires undocumented section field | Breaks table creation flow |
| P3 | BUG-15 — food_type filter inaccurate | Incorrect query results |
| P3 | BUG-04 — OTP rate-limited in 03-auth | Fix test to reuse cached token |
| P3 | BUG-09 — Missing img/heading elements | Accessibility compliance |
| P4 | BUG-03, BUG-06, BUG-07, BUG-11, BUG-12 | Minor UI/UX gaps |
| P4 | BUG-16, BUG-17, BUG-18, BUG-19 — Ordering/pagination/actions | Feature completeness |

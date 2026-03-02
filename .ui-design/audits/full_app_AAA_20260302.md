# Accessibility Audit Report — Com Tấm Mã Tú CRM

**Audit ID:** `full_app_AAA_20260302`
**Date:** 2026-03-02
**Target:** Entire application (76 TSX components across 5 route groups)
**WCAG Level:** AAA
**Standard:** WCAG 2.1

---

## Executive Summary

**Compliance Status:** ❌ Needs Improvement

| Severity | Count | % of Issues |
| -------- | ----- | ----------- |
| Critical | 8     | 16%         |
| Serious  | 15    | 30%         |
| Moderate | 18    | 36%         |
| Minor    | 9     | 18%         |

**Total Issues:** 50
**Criteria Checked:** 78
**Criteria Passed:** 41 (53%)
**Files Audited:** 76

### Color Contrast Summary (OKLCH-calculated)

| Pair | Light Mode | Dark Mode | AAA Normal (7:1) | AAA Large (4.5:1) |
|------|-----------|-----------|-------------------|--------------------|
| foreground / background | 19.8:1 ✅ | 19.0:1 ✅ | Pass | Pass |
| muted-foreground / background | **4.7:1 ❌** | 7.6:1 ✅ | **FAIL light** | Pass |
| muted-foreground / card | **4.7:1 ❌** | **6.9:1 ❌** | **FAIL both** | Pass |
| destructive / background | **4.3:1 ❌** | — | **FAIL** | Marginal |
| green-600 / white | 6.5:1 ❌ | — | **FAIL** | Pass |
| red-600 / white | 6.0:1 ❌ | — | **FAIL** | Pass |
| yellow-500 / white | **2.9:1 ❌** | — | **FAIL** | **FAIL** |
| green-400 / gray-900 (KDS) | — | 5.9:1 ❌ | **FAIL** | Pass |

---

## Critical Issues (Must Fix)

### C-01: `muted-foreground` fails AAA contrast in light mode

**WCAG Criterion:** 1.4.6 Contrast Enhanced (Level AAA)
**Severity:** Critical
**Location:** `globals.css:61` — `--muted-foreground: oklch(0.556 0 0)`
**Affects:** ~120+ instances across every route group

**Problem:** The `text-muted-foreground` color provides only **4.7:1** contrast against white backgrounds. AAA requires **7:1** for normal text.

**Impact:** Users with low vision or moderate color blindness cannot reliably read secondary text, timestamps, labels, and helper text across the entire application.

**Remediation:**
Darken `muted-foreground` in light mode from `oklch(0.556 0 0)` to approximately `oklch(0.44 0 0)` which yields ~8.0:1.

```css
/* Before */
--muted-foreground: oklch(0.556 0 0);

/* After (AAA compliant) */
--muted-foreground: oklch(0.44 0 0);
```

---

### C-02: Color-only status indication — KDS ticket timing

**WCAG Criterion:** 1.4.1 Use of Color (Level A)
**Severity:** Critical
**Location:** `(kds)/kds/[stationId]/ticket-card.tsx:91-119`

**Problem:** KDS ticket cards use border/background color alone (green → yellow → red) to convey timing urgency. No text label or icon distinguishes normal, warning, and critical states.

**Impact:** Color-blind kitchen staff cannot determine order urgency at a glance.

**Remediation:**
Add a visible text label or icon for timing status:

```tsx
// Before
<div className={cn("flex flex-col rounded-xl border-2 p-4", colors.border, colors.bg)}>

// After
<div
  className={cn("flex flex-col rounded-xl border-2 p-4", colors.border, colors.bg)}
  aria-label={`Order ${orderNumber}, ${getTimingLabel(elapsed, timingRule)}`}
>
  <span className="text-xs font-medium">
    {getTimingLabel(elapsed, timingRule)} {/* "Bình thường" | "Gần trễ" | "Trễ" */}
  </span>
```

---

### C-03: Color-only status — stock levels, leave requests, security events

**WCAG Criterion:** 1.4.1 Use of Color (Level A)
**Severity:** Critical
**Locations:**
- `(admin)/admin/inventory/stock-levels-tab.tsx:248-256`
- `(admin)/admin/hr/leave-tab.tsx:200-210`
- `(admin)/admin/security/events-tab.tsx`
- `(admin)/admin/crm/feedback-tab.tsx:217-224`

**Problem:** Status badges and indicators rely on color (green/red/yellow) as the sole differentiator without text patterns or icons for redundancy.

**Remediation:** Ensure every colored badge also contains descriptive text (most already do — verify each has visible text, not just icon+color).

---

### C-04: Icon-only buttons without accessible names (systemic)

**WCAG Criterion:** 1.1.1 Non-text Content (Level A), 4.1.2 Name, Role, Value (Level A)
**Severity:** Critical
**Locations:** 30+ instances across all route groups

**Problem:** Buttons containing only a Lucide icon (edit, delete, approve, back arrow, close) have no `aria-label`. Many use `title` which is unreliable for screen readers.

**Examples:**
- `terminals-table.tsx:285` — Approve button: `<Button title="Phê duyệt"><CheckCircle /></Button>`
- `order-detail-client.tsx:114` — Back button: `<Button><ArrowLeft /></Button>`
- `payment-panel.tsx:280` — Remove voucher: `<Button><X /></Button>`
- `stations-table.tsx:361` — Edit button with only icon

**Remediation:**
Replace `title` with `aria-label` on every icon-only button:
```tsx
// Before
<Button variant="ghost" size="icon" title="Phê duyệt">
  <CheckCircle className="h-4 w-4" />
</Button>

// After
<Button variant="ghost" size="icon" aria-label="Phê duyệt thiết bị">
  <CheckCircle className="h-4 w-4" aria-hidden="true" />
</Button>
```

---

### C-05: Form error messages not associated with inputs

**WCAG Criterion:** 3.3.1 Error Identification (Level A), 3.3.3 Error Suggestion (Level AA)
**Severity:** Critical
**Locations:** Every form component (15+ files)

**Problem:** Error messages render as standalone `<div>` elements with no `aria-describedby` linking them to the field that caused the error, and no `role="alert"` for screen reader announcement.

**Examples:**
- `login-form.tsx:34-37`
- `session-form.tsx:85-88, 191-194`
- `customers-tab.tsx:124-127`
- `employees-tab.tsx`
- `feedback-form.tsx`

**Remediation:**
```tsx
// Before
{error && (
  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
)}

// After
{error && (
  <div id="form-error" role="alert" aria-live="assertive"
       className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
)}
<Input aria-describedby={error ? "form-error" : undefined} />
```

---

### C-06: Missing page titles on customer routes

**WCAG Criterion:** 2.4.2 Page Titled (Level A)
**Severity:** Critical
**Locations:**
- `(customer)/customer/menu/page.tsx`
- `(customer)/customer/orders/page.tsx`
- `(customer)/customer/loyalty/page.tsx`
- `(customer)/customer/feedback/[orderId]/page.tsx`
- `(customer)/customer/account/page.tsx`
- `login/page.tsx`

**Problem:** No `export const metadata` with title/description on these pages, so the browser tab shows only the generic app name.

**Remediation:**
```tsx
export const metadata: Metadata = {
  title: "Thực đơn - Com Tấm Mã Tú",
  description: "Xem thực đơn và đặt món",
};
```

---

### C-07: Star rating buttons lack accessible names

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value
**Severity:** Critical
**Location:** `(customer)/customer/feedback/[orderId]/feedback-form.tsx:122-142`

**Problem:** Five star buttons use only SVG star icons with no `aria-label` or text. Screen reader users cannot determine which star is which or the current selection.

**Remediation:**
```tsx
<button
  aria-label={`${star} sao`}
  aria-pressed={rating === star}
  // ... existing props
>
  <Star aria-hidden="true" className={cn(...)} />
</button>
```

---

### C-08: Progress bar missing ARIA roles

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value
**Severity:** Critical
**Location:** `(customer)/customer/loyalty/loyalty-dashboard.tsx:112-117`

**Problem:** Loyalty progress bar is a plain `<div>` with no `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, or `aria-valuemax`.

**Remediation:**
```tsx
<div
  role="progressbar"
  aria-valuenow={currentPoints}
  aria-valuemin={0}
  aria-valuemax={nextTier?.min_points || currentPoints}
  aria-label={`Tiến độ tới hạng ${nextTier?.name}: ${progressPercent}%`}
  className="bg-muted h-2 overflow-hidden rounded-full"
>
```

---

## Serious Issues

### S-01: Missing skip-to-content links (all layouts)

**WCAG Criterion:** 2.4.1 Bypass Blocks (Level A)
**Severity:** Serious
**Locations:** All 5 layout files:
- `layout.tsx` (root)
- `(admin)/layout.tsx`
- `(pos)/layout.tsx`
- `(kds)/layout.tsx`
- `(customer)/layout.tsx`

**Remediation:** Add to each layout:
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
  Bỏ qua đến nội dung chính
</a>
// ... navigation ...
<main id="main-content">{children}</main>
```

---

### S-02: Table headers missing `scope` attribute

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)
**Severity:** Serious
**Locations:** All table components (~15 files):
- `top-items.tsx`, `recent-orders.tsx`, `customers-tab.tsx`, `terminals-table.tsx`, `stations-table.tsx`, `menus-table.tsx`, `employees-tab.tsx`, `stock-levels-tab.tsx`, `stock-movements-tab.tsx`, `suppliers-tab.tsx`, etc.

**Problem:** `<TableHead>` elements lack `scope="col"` or `scope="row"`.

**Remediation:**
```tsx
<TableHead scope="col">Tên</TableHead>
```

---

### S-03: Missing `aria-live` on dynamic status messages

**WCAG Criterion:** 4.1.3 Status Messages (Level AA)
**Severity:** Serious
**Locations:**
- `payment-panel.tsx:448-472` — QR loading, payment waiting
- `cashier-client.tsx` — toast notifications
- `kds-board.tsx` — realtime order updates
- All loading states across the app

**Remediation:** Add `role="status"` and `aria-live="polite"` to loading indicators and status messages.

---

### S-04: Form inputs missing label associations

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A), 3.3.2 Labels or Instructions (Level A)
**Severity:** Serious
**Locations:**
- `menu-browser.tsx:69-74` — Search input, placeholder only
- `payment-panel.tsx:292-298` — Voucher code input, no label
- Multiple `Select` components without explicit label linkage

**Remediation:**
```tsx
<Label htmlFor="menu-search" className="sr-only">Tìm món ăn</Label>
<Input id="menu-search" aria-label="Tìm món ăn" placeholder="Tìm món ăn..." />
```

---

### S-05: `yellow-500` text fails even AA contrast

**WCAG Criterion:** 1.4.6 Contrast Enhanced (Level AAA)
**Severity:** Serious
**Locations:** Any file using `text-yellow-500` on white background

**Problem:** Yellow-500 on white provides only **2.9:1** contrast — fails even AA minimum (4.5:1).

**Remediation:** Use `text-yellow-700` or `text-amber-700` (darker variants) for text.

---

### S-06: `destructive` color borderline for AAA

**WCAG Criterion:** 1.4.6 Contrast Enhanced (Level AAA)
**Severity:** Serious
**Location:** `globals.css:64` — `--destructive: oklch(0.577 0.245 27.325)`

**Problem:** Destructive color at 4.3:1 fails AAA (7:1) and is marginal even for AA.

**Remediation:** Darken to approximately `oklch(0.45 0.245 27.325)` for AAA compliance.

---

### S-07: `green-600` / `red-600` text fails AAA

**WCAG Criterion:** 1.4.6 Contrast Enhanced (Level AAA)
**Severity:** Serious
**Locations:** All files using `text-green-600` or `text-red-600` for status text

**Problem:** green-600 at ~6.5:1 and red-600 at ~6.0:1 both fail the 7:1 AAA threshold.

**Remediation:** Use `text-green-800` / `text-red-800` or custom darker tokens.

---

### S-08: Missing `aria-expanded` on toggle buttons

**WCAG Criterion:** 4.1.2 Name, Role, Value (Level A)
**Severity:** Serious
**Locations:**
- `order-history.tsx:83-93` — Expand/collapse order items
- Tab components across admin section

**Remediation:**
```tsx
<button aria-expanded={expanded} aria-label={`${expanded ? 'Ẩn' : 'Hiển thị'} chi tiết đơn hàng`}>
```

---

### S-09: Missing `aria-current="page"` on active navigation

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)
**Severity:** Serious
**Locations:** Customer nav, Admin sidebar — active link not announced

**Remediation:**
```tsx
<Link href={item.href} aria-current={isActive ? "page" : undefined}>
```

---

### S-10: Badge onClick without keyboard support

**WCAG Criterion:** 2.1.1 Keyboard (Level A)
**Severity:** Serious
**Location:** `menu-selector.tsx:166-177`

**Problem:** `<Badge>` with `onClick` is not a native button — no keyboard handler, no `role="button"`, no `tabIndex`.

**Remediation:** Change to `<Button>` or add `role="button" tabIndex={0} onKeyDown`.

---

### S-11 – S-15: Additional form/input association issues

**Severity:** Serious — scattered across `customers-tab.tsx`, `employees-tab.tsx`, `ingredients-tab.tsx`, `recipes-tab.tsx`, `purchase-orders-tab.tsx`. Each has dialog forms where Label `htmlFor` doesn't consistently match Input `id` or error IDs are missing.

---

## Moderate Issues

### M-01: Touch targets below 44×44px (AAA requirement)

**WCAG Criterion:** 2.5.5 Target Size (Level AAA)
**Severity:** Moderate
**Locations:**
- `menu-selector.tsx:187-207` — Plus/Minus buttons at `h-8 w-8` (32px)
- `order-cart.tsx:108-128` — Quantity buttons at `h-8 w-8` (32px)
- `menu-browser.tsx:83-87` — Category filter pills at `min-h-[36px]`
- `payment-panel.tsx:280-288` — Remove voucher at `h-6 w-6` (24px)

**Remediation:** Increase to `h-11 w-11` minimum (44px).

---

### M-02: Missing `prefers-reduced-motion` support

**WCAG Criterion:** 2.3.3 Animation from Interactions (Level AAA)
**Severity:** Moderate
**Locations:**
- All Recharts chart components (revenue-chart, hourly-chart, status-chart)
- Loader2 `animate-spin` instances
- KDS ticket-card `transition-all`

**Remediation:** Add global CSS:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-spin { animation: none; }
  * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

---

### M-03: Missing heading hierarchy (h1 per page)

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A), 2.4.6 Headings and Labels (Level AA)
**Severity:** Moderate
**Problem:** Many admin pages jump directly to `h2` without an `h1`. Some pages have no headings.

**Remediation:** Ensure each page has exactly one `h1` followed by proper `h2` → `h3` hierarchy.

---

### M-04: Decorative icons missing `aria-hidden`

**WCAG Criterion:** 1.1.1 Non-text Content (Level A)
**Severity:** Moderate
**Locations:** ~50+ decorative Lucide icons (in cards, next to text labels)

**Remediation:** Add `aria-hidden="true"` to all icons that are adjacent to visible text labels.

---

### M-05: Navigation landmark missing `aria-label`

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)
**Severity:** Moderate
**Location:** Customer nav component, Admin sidebar

**Remediation:** `<nav aria-label="Điều hướng chính">` or `<nav aria-label="Admin sidebar">`

---

### M-06 – M-18: Additional moderate issues

- **M-06:** Truncated text without `title` attribute for full content
- **M-07:** Password field lacks requirement description in label
- **M-08:** Missing `<fieldset>` / `<legend>` for grouped form fields
- **M-09:** Focus order not explicit in dialog/modal components
- **M-10:** Tab panels missing `aria-labelledby` association
- **M-11:** KDS dark theme green-500 on gray-800 at only 3.7:1
- **M-12:** Loading spinners without `role="status"`
- **M-13:** Momo QR alt text not descriptive enough
- **M-14:** Table sorting not announced to screen readers
- **M-15:** Auto-refreshing content (KDS realtime) without pause control
- **M-16:** Mobile viewport scroll behavior on long forms
- **M-17:** Insufficient focus ring contrast on custom buttons
- **M-18:** Missing `lang="vi"` on Vietnamese-specific content in mixed contexts

---

## Minor Issues

### N-01 – N-09

- **N-01:** No `autoFocus` found ✅ (pass)
- **N-02:** No positive `tabIndex` found ✅ (pass)
- **N-03:** Missing abbreviation expansions for "POS", "KDS", "CRM", "HR" (WCAG 3.1.4, Level AAA)
- **N-04:** Inconsistent button labels ("Thao tác" is vague)
- **N-05:** Some admin tables could benefit from `<caption>` elements
- **N-06:** Date/time formats not localized with `lang` attribute
- **N-07:** No visible "text spacing" override support (WCAG 1.4.12)
- **N-08:** Chart data not available as text alternative (WCAG 1.1.1)
- **N-09:** No high-contrast mode support beyond system dark mode

---

## Passed Criteria

| Criterion | Name | Level |
|-----------|------|-------|
| 1.2.1 | Audio-only and Video-only | A |
| 2.1.2 | No Keyboard Trap | A |
| 2.2.1 | Timing Adjustable | A |
| 2.3.1 | Three Flashes or Below | A |
| 2.4.4 | Link Purpose (In Context) | A |
| 3.1.1 | Language of Page | A |
| 3.2.1 | On Focus | A |
| 3.2.2 | On Input | A |
| 3.2.3 | Consistent Navigation | AA |
| 3.2.4 | Consistent Identification | AA |
| 4.1.1 | Parsing (deprecated in 2.2) | A |

---

## Recommendations

### Quick Wins (< 1 hour each)

1. Darken `--muted-foreground` in `globals.css` to `oklch(0.44 0 0)` — fixes 120+ contrast violations
2. Add `aria-hidden="true"` to all decorative Lucide icons (batch find/replace)
3. Add `role="alert"` to all error message `<div>`s
4. Add `scope="col"` to all `<TableHead>` elements
5. Add skip link to root layout
6. Add metadata exports to the 6 pages missing titles

### Medium Effort (1–4 hours each)

1. Audit every icon-only button and add `aria-label` (~30 instances)
2. Associate all form errors with inputs via `aria-describedby` (~15 forms)
3. Add `prefers-reduced-motion` CSS global rule
4. Replace `<Badge onClick>` with `<Button>` for keyboard accessibility
5. Increase all small touch targets from 32px to 44px
6. Add `aria-expanded` to all toggle/accordion buttons

### Significant Effort (> 4 hours)

1. Implement comprehensive ARIA for KDS ticket timing states + text labels
2. Add text alternatives for all chart data (data tables below charts)
3. Add `<fieldset>` + `<legend>` groupings across all admin forms
4. Create high-contrast theme variant
5. Full heading hierarchy audit and restructure across all 30 routes

---

## Testing Resources

### Automated Testing

```typescript
// apps/web/__tests__/a11y.test.tsx
import { axe, toHaveNoViolations } from "jest-axe";
import { render } from "@testing-library/react";

expect.extend(toHaveNoViolations);

test("login page has no a11y violations", async () => {
  const { container } = render(<LoginPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing Checklist

- [ ] Navigate entire POS flow using only keyboard (Tab, Enter, Escape)
- [ ] Test KDS board with screen reader (VoiceOver/NVDA) — verify ticket timing announced
- [ ] Zoom to 200% and verify all customer pages are usable
- [ ] Enable high contrast mode and verify all status indicators visible
- [ ] Verify focus indicators visible on every interactive element
- [ ] Test with `prefers-reduced-motion: reduce` — verify no animations
- [ ] Test star rating with keyboard only
- [ ] Verify form errors announced by screen reader when they appear

### Recommended Tools

- axe DevTools browser extension (automated scanning)
- WAVE Web Accessibility Evaluator
- Lighthouse accessibility audit
- Colour Contrast Analyser (CCA) for OKLCH verification
- NVDA + Firefox for screen reader testing
- VoiceOver + Safari for macOS testing

---

_Generated by UI Design Accessibility Audit_
_WCAG Reference: https://www.w3.org/WAI/WCAG21/quickref/_
_Audit completed: 2026-03-02_

# SPEC.md — QuickBooks Online (2026 Edition) UI Specification

## §13. Edit-Mode State & Header Chrome

### 1. State Model
Everything hangs off an edit-mode flag and a drawer-open flag:
```javascript
const [editMode, setEditMode] = useState(false);
const [drawerOpen, setDrawerOpen] = useState(false);
```
- **Entry**: Click the sliders icon in the normal mode header (or the pinned "Customize" button at the bottom of the sidebar rail) → `editMode = true`.
- **Exit**: Click the solid green "Save" button in the edit mode header → persists layout and sets `editMode = false`.

### 2. Header (y: 36–74, Viewport 1920×960) Swaps Content:
| Element | Position | Specification |
| :--- | :--- | :--- |
| **"Business at a glance"** | x: 125, y: ~50 | 19px / 600 Inter, color `#393A3D` |
| **"Learn how to customize your layout"** | x: ~1197–1489, y: ~55 | 15px `#0077C5`, underline on hover, cursor-pointer |
| **"Add or remove widgets"** | x: 1503–1735, h: 38px | 2px solid `#2CA01C` border, white bg, `#2CA01C` 15px / 600 text, radius 6px → opens drawer |
| **"Save"** | x: 1750–1860, h: 38px | Solid `#2CA01C` bg, white 15px / 600 text, radius 6px |

```css
.btn-outline-green {
  height: 38px;
  padding: 0 20px;
  background: #ffffff;
  border: 2px solid var(--brand-green);
  border-radius: 6px;
  color: var(--brand-green);
  font: 600 15px Inter, sans-serif;
}

.btn-green {
  height: 38px;
  padding: 0 24px;
  background: var(--brand-green);
  color: #ffffff;
  border: 0;
  border-radius: 6px;
  font: 600 15px Inter, sans-serif;
}
```

### 3. Feedback Banner (x: 128–1858, y: 100–168, h: 68px)
- **Container**: Background `#EFEFF1` (light gray), radius 8px, full width between margins.
- **Content**: Horizontally centered flex container:
  - Text: `"Are these customization options useful?"` (15px / 500 Inter, color `#393A3D`).
  - Circular buttons: Two 38–40px circular icon buttons with 1px solid `#393A3D` outline:
    - Thumbs Up (`ThumbsUp` icon, 18px).
    - Thumbs Down (`ThumbsDown` icon, 18px).
  - Clicking either acknowledges feedback: replaces with `"Thanks for your feedback!"`.

---

## §14. Selection Borders, Handles & The Edit Grid

### 1. Selection Borders and Handles
Every editable widget in edit mode is decorated with:
```css
.widget-editing {
  border: 2px solid var(--brand-green) !important;
  border-radius: 8px;
  position: relative;
}

.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--brand-green);
  z-index: 20;
}

.handle.n { top: -6px; left: 50%; transform: translateX(-50%); }
.handle.s { bottom: -6px; left: 50%; transform: translateX(-50%); }
.handle.w { left: -6px; top: 50%; transform: translateY(-50%); }
.handle.e { right: -6px; top: 50%; transform: translateY(-50%); }
```

### 2. Edit-Mode Grid Layout (4 Columns)
Grid container: `display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;`
- **Row 1 (y: 197–548, h: 351px)**:
  1. `col 1` (w: ~413px): Profit & Loss card
  2. `col 2` (w: ~413px): Expenses Donut card
  3. `col 3` (w: ~413px): Bank Accounts card
  4. `col 4` (w: ~413px): Add widgets placeholder card
- **Row 2 (y: 573–928, h: 351px)**:
  1. `col 1 & 2` (span 2, w: ~850px): Cash Flow Trend card
  2. `col 3` (w: ~413px): Accounts Payable card
  3. `col 4` (w: ~413px): Empty slot

---

## §15. "Add Widgets" Placeholder Card (x: 1445–1860, y: 197–548)

Always occupies the fourth cell in Row 1 during edit mode:
- **Card**: White background, 2px solid `#2CA01C` border, rounded 8px, padding 24px, centered text and items.
- **Top**: Title `"Add widgets"` (18px / 600 Inter, `#393A3D`).
- **Plus Button**: 44px circular button, background `#E9EBED`, dark `+` icon (`Plus` size 22) → clicking opens the Add widgets drawer.
- **Divider**: 1px horizontal line (`#E3E5E8`), full card width.
- **Smart Suggestions**: Wand / Sparkles icon (16px) + `"Smart suggestions"` (16px / 600 Inter).
- **Pill Buttons**: Row of two pill outline buttons (height 33px, radius 999px, border 1px solid `#C7CBCE`, 14px text):
  - `"Sales"`
  - `"Accounts receivable"`
- **Footer**: `?` Help circle icon + `"Why am I seeing these suggestions?"` (13px muted `#6B6C72`, centered).

---

## §16. Accounts Payable Widget (x: 1007–1420, y: 573–928)

| Element | Position / Style | Specification |
| :--- | :--- | :--- |
| **Header** | Top row | `"ACCOUNTS PAYAB..."` (13px / 600 uppercase truncated) + `RotateCw` 14px refresh icon; `"As of today"` 13px muted right |
| **Updated Timestamp** | y: +48 | `"Data updated 11 minutes ago"` (12px `#6B6C72`) |
| **Total Amount** | y: +89 / +124 | `"Total A/P amount"` (14px) and **`$1,602.67`** (28px / 600 semibold `#393A3D`) |
| **Aging Rows** | Left side | 🟢 **`$0.00`** / *Current* (`#2CA01C`)<br>🔵 **`$755.00`** / *1-7 days* (`#4E9FD4`)<br>🟠 **`$0.00`** / *8-14 days* (`#E8A33D`) |
| **270° Gauge SVG** | Right side (120×120) | 270° sweep, stroke 22px, radius 46px; 90° gap oriented at the top-left quadrant |
| **Footer** | Bottom-left | `"Go to report"` (14px `#0077C5`, hover:underline) |

### Gauge SVG Implementation:
```jsx
// 270° sweep (0.75 * circumference) with 90° opening at top-left:
<svg viewBox="0 0 120 120" className="w-[124px] h-[124px]">
  <g transform="rotate(125 60 60)">
    {/* Segments: Steel Blue 55% (#4E9FD4), Pink 15% (#EC6FA8), Light Blue 30% (#A9CBE8) */}
  </g>
</svg>
```

---

## §17. "Add Widgets" Drawer (x: 1495–1920, Full Height 0–960)

Fixed right panel: width 425px, white background, shadow `-6px 0 24px rgba(0,0,0,0.12)`, z-index 50.
- **Header (h: 56px)**: `"Add widgets"` (18px / 600 Inter, centered), close button `X` (size 20) top-right, border-bottom `#E3E5E8`.
- **Title**: `"Select widgets for your dashboard"` (20px / 600 Inter).
- **Smart Suggestions Section**:
  - ✨ `"Smart suggestions"` (14px / 600).
  - Checkbox rows: `"Sales"`, `"Accounts receivable"` (unchecked).
- **Divider**: 1px `#E3E5E8`.
- **All Widgets Section**:
  - `"All widgets"` (14px / 600).
  - 14 Checkbox Rows (height 42px each, hover `#F6F7F8`):
    - Accounts Payable
    - Accounts receivable
    - Bank Accounts *(Checked ✓)*
    - Cash flow *(Checked ✓)*
    - Deposits
    - Expenses *(Checked ✓)*
    - Invoices
    - Mileage
    - My Integrations
    - Profit & loss *(Checked ✓)*
    - Referrals
    - Sales
    - Sales & Get Paid Funnel
    - Smart suggestions *(Checked ✓, with Info icon)*
- **Checkbox Appearance**:
  - 20×20px square with 4px border radius.
  - Unchecked: 1.5px `#9DA2A8` border, white background.
  - Checked: Solid `#2CA01C` background and border with white checkmark.

---

## §18. Dataset Additions (`dashboard.json`)
```json
{
  "accountsPayable": {
    "title": "ACCOUNTS PAYAB...",
    "asOf": "As of today",
    "updated": "Data updated 11 minutes ago",
    "total": "$1,602.67",
    "buckets": [
      { "amount": "$0.00", "label": "Current", "color": "#2CA01C" },
      { "amount": "$755.00", "label": "1-7 days", "color": "#4E9FD4" },
      { "amount": "$0.00", "label": "8-14 days", "color": "#E8A33D" }
    ],
    "gauge": [
      { "color": "#4E9FD4", "pct": 55 },
      { "color": "#EC6FA8", "pct": 15 },
      { "color": "#A9CBE8", "pct": 30 }
    ],
    "footerLink": "Go to report"
  }
}
```

---

## §19. Acceptance Checklist
- [x] Click Sliders in header or Customize in sidebar to enter Edit Mode.
- [x] Header swaps to "Learn how to customize your layout" + green-outline "Add or remove widgets" + solid green "Save".
- [x] Feedback banner displays with Thumbs Up and Thumbs Down circular buttons.
- [x] Editable widgets receive 2px solid `#2CA01C` green borders and 12px midpoint green drag handles.
- [x] Placeholder card renders with +, Smart suggestions, and pill buttons.
- [x] Cash Flow Trend expands to span 2 columns in Row 2.
- [x] Accounts Payable card renders with truncated title, refresh icon, and 270° gauge.
- [x] Add widgets drawer slides in from right (425px wide) with green checkboxes and live toggles.
- [x] Save button exits Edit Mode cleanly.

---

## §20. Tooltip & Sliders Hover State (Normal Mode)

Hovering over the sliders button in the glance header:
- **Trigger**: The sliders icon displays a 36×36 rounded-8 hover background `#E3E5E8`.
- **Tooltip**: Dark tooltip box positioned at `bottom: calc(100% + 10px); right: 0;` (floating above the icon, right-aligned).
- **Style**: Background `#2E2F31`, text white 14px Inter, padding 10px 14px, radius 6px, single line: `"Customize your dashboard."`.
- **Behavior**: Displays after a 400ms hover delay, hides on mouse-out; `role="tooltip"`, `aria-describedby` on the button.

```css
.tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  background: #2E2F31;
  color: #ffffff;
  font: 400 14px Inter, sans-serif;
  padding: 10px 14px;
  border-radius: 6px;
  white-space: nowrap;
}
```

---

## §21. Saved Layout in Normal Mode (Screenshot 1)

The customized arrangement persists into normal mode — 4-column grid, no green borders, no feedback banner, standard header icons:
- **Row 1 (y: 196–547)**:
  - `col 1` (1): Profit & Loss card
  - `col 2` (1): Expenses Donut card
  - `col 3` (1): Accounts Payable card
  - `col 4` (1): Add widgets placeholder card (**Dashed border variant**)
- **Row 2 (y: 573–928)**:
  - `col 1 & 2` (span 2): Cash Flow Trend card
  - `col 3` (1): Bank Accounts card
  - `col 4` (1): Empty cell

### Placeholder Card in Normal Mode (Dashed Border Variant)
```css
.placeholder {
  border: 2px dashed #B9BDC1;
  border-radius: 8px;
  background: transparent;
}
/* Edit mode override: .widget-editing.placeholder { border: 2px solid var(--brand-green); } */
```
Contents identical to §15 (title, + circle, divider, Smart suggestions, pills, help line). The "+" and pill buttons open the drawer.

---

## §22. Accounts Payable Gauge — Refined Visual Specification

- **Size**: ~150×150px, ring stroke ≈ 26–30px, radius ≈ 50–55px, hole ≈ 70px, positioned on the right half of the card.
- **Segments**:
  - Dark Blue `#1C7FD6` (~45%, right side)
  - Light Blue `#7FB8E6` (~40%, left/bottom)
  - Magenta / Pink `#E5348B` (~15%, bottom)
- **Sweep**: ~300° (0.83 × circumference) with small white gap near 11–12 o'clock.
- **Timestamp**: `"Data updated 11 minutes ago"` styled in 12px italic `#6B6C72`.

---

## §23. Drag & Remove Affordance (Screenshot 2)

While actively dragging a widget in edit mode, a `DragOverlay` follows the cursor (the widget itself remains visible in the grid beneath):

| Element | Position | Specification |
| :--- | :--- | :--- |
| **Move cluster** | 100×100px, centered on cursor | Background `#1B8A1B`, radius 8px, four white 24px arrows (`ArrowUp`, `ArrowLeft`, `ArrowRight`, `ArrowDown`) in diamond configuration |
| **Remove button** | 44×44px, 36px below cluster, offset ~26px left | Background `#1B8A1B`, radius 8px, white `Trash2` 20px icon |

### Remove Flow
1. Click trash button on the drag affordance.
2. Widget is removed from the layout array immediately.
3. Grid re-flows; placeholder / empty cells absorb freed space.
4. Toast notification appears at bottom center: `"Widget removed"` with a blue `"Undo"` link. Auto-dismiss after 4 seconds.

---

## §24. Dataset Additions (`dashboard.json`)
```json
{
  "tooltips": {
    "customize": "Customize your dashboard."
  },
  "apGauge": {
    "size": 150,
    "sweepPct": 83,
    "segments": [
      { "color": "#1C7FD6", "pct": 45 },
      { "color": "#7FB8E6", "pct": 40 },
      { "color": "#E5348B", "pct": 15 }
    ]
  },
  "savedLayout": [
    { "id": "pnl", "span": 1 },
    { "id": "expenses", "span": 1 },
    { "id": "ap", "span": 1 },
    { "id": "placeholder", "span": 1 },
    { "id": "cashflow", "span": 2 },
    { "id": "bank", "span": 1 }
  ]
}
```

---

## §25. Full State Machine & Acceptance Checklist

```
NORMAL (Saved Layout)
 ├── hover sliders (400ms delay) ──→ tooltip "Customize your dashboard."
 ├── click sliders / Customize (rail) ──→ EDIT MODE
 └── placeholder "+" / pills ──→ opens drawer
EDIT MODE
 ├── drag widget ──→ DragOverlay (100×100 green move cluster + 44×44 trash button)
 ├── click trash ──→ removes widget from layout + bottom toast with "Undo"
 ├── "Add or remove widgets" / "+" ──→ drawer opens (checkboxes toggle widget presence)
 ├── 4 midpoint green handles ──→ visual resize affordance
 └── Save ──→ persists layout into savedLayout ──→ returns to NORMAL
```

- [x] Dark tooltip appears above sliders icon after 400ms hover delay.
- [x] Normal mode with saved layout renders P&L, Expenses, AP, dashed Placeholder in Row 1; Cash Flow (span 2) and Bank in Row 2.
- [x] AP gauge donut renders ~150px with 3 segments (dark blue, light blue, magenta) and small gap near top.
- [x] Edit mode drag affordance displays 100×100 green arrow cluster and 44×44 trash button.
- [x] Trash click removes widget and displays `"Widget removed"` toast with interactive `"Undo"`.
- [x] Save button exits Edit Mode and updates the normal mode layout cleanly.

---

## §26. Eye Icon Tooltip (Two Variants)

Hovering over the eye icon in the glance header:
- **Hover Pill**: 36×36 rounded-8 background `#E3E5E8` behind the eye icon.
- **Tooltip Container**: Dark box (`#2E2F31`), floating above the icon at `bottom: calc(100% + 14px); right: 0;`, width ~286px, padding `12px 14px`, radius 6px, text white 14px Inter with line-height 1.45, downwards caret at bottom right pointing to the icon.
- **Variant 1 (When Financial Info is Visible)**:
  - Text: `"Hide the financial info on your dashboard."` (wraps to 2 lines).
  - Contains a white right chevron `›` (`ChevronRight` 16px) vertically centered at the right edge.
- **Variant 2 (When Financial Info is Hidden / Privacy Mode ON)**:
  - Text: `"Show the financial info on your dashboard."` (wraps to 2 lines).
  - No chevron.

---

## §27. Privacy Mode — Masked Glance Section (Screenshot 2)

`privacyEnabled` is an orthogonal boolean toggled by clicking the eye icon (or clicking the privacy notice).
When ON, all widget cards in "Business at a glance" are completely hidden and replaced by static skeleton bars floating directly on the canvas in the exact 4-column rhythm:

| Skeleton Bar | Position | Size |
| :--- | :--- | :--- |
| **Row 1, all 4 columns: Top Bar** | y: ~215 | 178px × 19px, radius 4px, background `#E7E9EC` |
| **Row 1, all 4 columns: Bottom Bar** | y: ~258 | 267px × 18px, radius 4px, background `#E7E9EC` |
| **Row 2, columns 1 and 3 only: Top Bar** | y: ~590 | 178px × 19px, radius 4px, background `#E7E9EC` |
| **Row 2, columns 1 and 3 only: Bottom Bar** | y: ~633 | 267px × 18px, radius 4px, background `#E7E9EC` |

```css
.skel {
  height: 19px;
  border-radius: 4px;
  background: #E7E9EC;
}
/* Static — no shimmer or pulse animation in privacy mode */
```

Columns 2 and 4 in Row 2 remain empty.

---

## §28. Privacy Notice Component

Centered horizontally and vertically in the masked region (`x: 753–1233`, 480×94px, center `y ≈ 695`):

```jsx
function PrivacyNotice({ onShow }) {
  return (
    <div className="privacy-notice" onClick={onShow} role="status">
      <div className="lock-ring">
        <Lock size={20} strokeWidth={2.2} />
      </div>
      <p>See your financial info by turning privacy off.</p>
    </div>
  );
}
```

```css
.privacy-notice {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 18px;
  width: 480px;
  height: 94px;
  padding: 24px 28px;
  background: #ffffff;
  border: 1px solid #D4D7DC;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  z-index: 20;
}

.privacy-notice p {
  font: 400 17px Inter, sans-serif;
  color: #393A3D;
  margin: 0;
}

.lock-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--brand-green);
  background: #ffffff;
  display: grid;
  place-items: center;
  color: var(--brand-green);
  flex-shrink: 0;
}
```

Clicking the notice card immediately turns privacy mode OFF.

---

## §29. State & Persistence

- **State Model**:
  ```javascript
  const [privacyEnabled, setPrivacyEnabled] = useState(() => {
    const saved = localStorage.getItem('qb_dashboard_privacy');
    return saved !== null ? JSON.parse(saved) : false;
  });
  ```
- **Persistence**: Persists across browser reloads via `localStorage` (and syncs via `PATCH /me/preferences { dashboardPrivacy: boolean }`).
- **Icon Glyph**: Plain `Eye` icon in both visible and hidden states, exactly matching reference screenshots.

---

## §30. Full State Machine & Acceptance Checklist

```
GLOBAL: privacyEnabled (persisted per user)
 ├── eye hover (400ms) ──→ 2-line dark tooltip + caret (hide variant includes '›' chevron)
 ├── eye click / notice click ──→ toggle privacyEnabled instantly
 └── privacyEnabled == true
      ├── hides all glance cards completely (no borders or card backgrounds)
      ├── renders static 4-column skeleton grid (§27)
      └── renders centered 480×94px PrivacyNotice card with green lock ring
```

- [x] Eye icon hover displays gray pill background and 2-line dark tooltip above with downward caret.
- [x] "Hide the financial info on your dashboard." tooltip includes a white right chevron `›`.
- [x] "Show the financial info on your dashboard." tooltip does not include a chevron.
- [x] Turning privacy ON immediately hides all cards and displays static skeleton bars in the exact 4-column grid.
- [x] Centered 480×94px Privacy Notice card displays green lock ring and "See your financial info by turning privacy off.".
- [x] Clicking the Privacy Notice or the Eye button turns privacy OFF immediately without reloading.
- [x] Privacy preference survives page reloads via `localStorage`.

---

# Part 6 — Global Search System (§31–§36)

## §31. Focused Search Bar State (Expanded Geometry & Overlay)

- **Normal vs Focused Geometry**:
  - Normal state: centered search bar `max-w-[640px]`, height 36px, `1px solid #9DA2A8`, rounded pill (`rounded-full`), placeholder text `"Navigate or search for transactions, contacts, reports, and more"`, search icon left (`#6B6C72`).
  - Focused state: expands to width `1310px`, height `44px`, `position: absolute`, centered at `left: 50%`, `transform: translateX(-50%)`, `top: 6px`, `z-index: 60`.
  - Border: `2px solid #2CA01C` (Intuit QuickBooks green focus ring), background `white`, box-shadow `0 8px 24px rgba(0,0,0,0.12)`.
  - Icon: green search icon (`#2CA01C`) left at 14px.
  - Clear Action: circular `X` button on right (`#6B6C72`, hover `#393A3D`) when query is present.
- **Top Navigation Collision Handling**:
  - Expanded search bar visually overlays the header canvas.
  - Company name on left (`min-w-[260px]`) is partially occluded and truncated to `"Sample Comp..."` while search is active.
  - Pressing `Escape` or clicking outside dismisses focused state and restores normal 640px pill width.

---

## §32. Search Dropdown — Empty State (Recent Transactions)

- **Attached Panel Geometry**:
  - Attached directly below search bar at `top: 44px`, `left: 50%`, `transform: translateX(-50%)`.
  - Width: `1334px` (matching Screenshot 1), background `white`, border `1px solid #E3E5E8`, `border-radius: 0 0 8px 8px`, `box-shadow: 0 8px 24px rgba(0,0,0,0.15)`, `z-index: 59`.
- **Header**:
  - Section label: `"Recent transactions"` (14px, font-semibold `#393A3D`, height ~24px).
- **Recent Transaction Rows**:
  - 5 rows rendered at ~44px height each:
    1. `Billexp Charge | Travis Waldron | 09/24/2025 | $103.55`
    2. `Expense 13 | Hicks Hardware | 09/21/2025 | $215.66`
    3. `Refund 1020 | Pye's Cakes | 09/25/2025 | $87.50`
    4. `Inventory START | — | 09/27/2025 | $0.00`
    5. `Invoice 1005 | 55 Twin Lane | 09/18/2025 | $54.00`
  - Columns separated by thin vertical dividers (`1px solid #D4D7DC`, height 16px).
  - Left icon: `History` / clock icon (16px, `#6B6C72`).
  - Row hover: `#F6F7F8` background, cursor pointer.
- **Expand Link**:
  - `"Show 5 more"` rendered in purple link token (`#7A3CE8`, 15px font-medium, hover underline).
- **Footer Strip**:
  - Full-width bottom bar at `height: 44px`, background `#F4F5F7`, border-top `1px solid #E3E5E8`, padding `0 24px`.
  - Interactive link: `"Advanced transactions search"` in blue (`#0077C5`) followed by normal gray text `"for more results"`.

---

## §33. Search Dropdown — Query State (Jump To & Help Topics)

- **Query-Triggered Content**:
  - When text is typed (e.g. `"in"`), dropdown switches from Recent transactions to dual sections:
    1. **Jump to** section:
       - Items matching query with leading icon:
         - Link icon (`Link2`, 16px `#6B6C72`) for pages/entities (e.g. `Invoices`, `Invoice list`, `Customer invoices`).
         - Plus icon (`Plus`, 16px `#6B6C72`) for quick-create actions (e.g. `Create invoice`).
       - Matching substring is bolded in pure black (`#000000`, `font-bold`), non-matching in `#393A3D`.
       - Expansion link: `"Show 9 more"` in purple (`#7A3CE8`).
    2. **Horizontal Divider**: `1px solid #E3E5E8`.
    3. **Help topics** section:
       - Items matching query with search icon (`Search`, 16px `#6B6C72`):
         - `Create an invoice`
         - `Record an invoice payment`
         - `Import invoices`
       - Matching substring bolded.
       - Expansion link: `"Show 5 more"` in purple (`#7A3CE8`).
- **Footer Strip**:
  - Same `#F4F5F7` strip: `"Advanced transactions search"` (`#0077C5`) + `"for more results"`.
- **Keyboard & Click Interactions**:
  - `Enter` submits query to full results view (`/search`).
  - Clicking any row navigates directly to the corresponding view/record.

---

## §34. Search Results Page (`/search`)

- **Header Block**:
  - Title: `"Search results"` (24px, font-semibold `#393A3D`).
  - Exact query sub-link: `"Search exact words instead: \"<query>\""` (purple link token `#7A3CE8`, hover underline).
  - Right utility links: `"Go to all transactions"` or `"Send us feedback"` (14px `#0077C5`).
- **Tab Bar**:
  - Tabs: `All`, `Transactions`, `Help` (16px font-medium).
  - Active tab (`Transactions`): `3px solid #2CA01C` bottom border, offset `-2px`, text `#393A3D font-semibold`.
  - Inactive tabs: text `#6B6C72`, hover `#393A3D`.
- **Customize Search Info Banner**:
  - Full-width rounded card (`border: 1.5px solid #0077C5`, `rounded-8`, padding 16px, background `white`).
  - Left circular `i` icon: 20px circle, solid `#0077C5`, white text.
  - Headline: `"Customize Search"` (15px font-semibold `#393A3D`).
  - Description: `"Select the filters and columns you want to see and customize the look and feel of the rows. Click the Customize button to personalize your view."` (14px `#6B6C72`).
  - Right: dismiss button (`X` icon 18px `#6B6C72`).
- **5-Field Filter Bar**:
  - 1. **Date range**: dropdown card (232×40px, `border: 1px solid #8D9096`, label `"Date range"`, value `"Custom"`, `Calendar` icon).
  - 2. **Transaction type**: select card (232×40px, label `"Transaction type"`, value `"Select..."`, split button chevron).
  - 3. **Reference number**: text input (200×40px, label `"Reference number"`, placeholder `"Type..."`).
  - 4. **Contact**: select card (232×40px, label `"Contact"`, value `"Select..."`, split button chevron).
  - 5. **Amount**: select card (232×40px, label `"Amount"`, value `"Select..."`, split button chevron).
  - **Filters Toggle**: `Filter` icon + `"Filters"` (15px `#393A3D`).
  - **Action Stack (Right)**:
    - Row 1: `Printer` and `Share2` icon buttons (18px `#393A3D`).
    - Row 2: `Sliders` icon + `"Customize"` link button.
- **Filter Chips**:
  - Removable pill chips (`height: 36px`, rounded-full, background `#E9EBED`, text 14px `#393A3D`):
    - `"Date range: 09/24/2025-10/24/2…"` + `X`
    - `"Transaction type: Invoice"` + `X`
  - Clicking `X` removes chip and updates query filters.
- **9-Column Results Table**:
  - Header row (12.5px font-semibold uppercase tracking `#393A3D`, grid layout: `144px 144px 144px 415px 170px 148px 115px 294px 1fr`):
    1. `DATE` + active sort down arrow (`ArrowDown` 14px)
    2. `TYPE`
    3. `REF NO.` + blue info tooltip (`HelpCircle` 14px `#0077C5`)
    4. `CONTACT` + blue info tooltip (`HelpCircle` 14px `#0077C5`)
    5. `DUE DATE`
    6. `BALANCE`
    7. `AMOUNT`
    8. `MEMO/DESCRIPTION`
    9. `LAST MODIFIED DATE`
  - Data rows (height 56px each, border-bottom `1px solid #E3E5E8`, hover `#F6F7F8`):
    - Exact mock records matching Screenshot 3:
      - `09/27/2025 | Invoice | 1037 | Sonnenschein Family Store | 10/27/2025 | $362.07 | $362.07 | — | Oct 24, 2025, 11:58 AM`
      - `09/27/2025 | Invoice | 1035 | Mark Cho | 10/27/2025 | $314.28 | $314.28 | — | Oct 24, 2025, 11:58 AM`
      - `09/27/2025 | Invoice | 1036 | Freeman Sporting Goods:0969 Ocean View Road | 10/27/2025 | $477.50 | $477.50 | — | Oct 24, 2025, 11:58 AM`
      - `09/26/2025 | Invoice | 1033 | Geeta Kalapatapu | 10/26/2025 | $629.10 | $629.10 | — | Oct 24, 2025, 11:58 AM`
      - `09/26/2025 | Invoice | 1034 | Rondonuwu Fruit and Vegi | 10/26/2025 | $78.60 | $78.60 | — | Oct 24, 2025, 11:58 AM`
      - `09/25/2025 | Invoice | 1023 | Red Rock Diner | 10/25/2025 | $70.00 | $70.00 | — | Oct 24, 2025, 11:58 AM`
    - Contact column rendered as blue clickable links (`#0077C5`, hover underline).

---

## §35. Feed Pagination & Secondary Refinements

- **Feed Card Pagination**:
  - Top-right corner of greeting feed widget features `‹ 1 of 2 ›` pagination controls.
  - Interactive chevron buttons cycle feed updates without re-fetching.
- **Privacy Masking Parity**:
  - In privacy mode, search results remain accessible via explicit search query, while dashboard glance widgets remain masked until privacy toggle is deactivated.

---

## §36. Acceptance Checklist & Verification

- [x] Search bar expands from 640px to 1310px wide × 44px tall with 2px green focus ring (`#2CA01C`) upon focus.
- [x] Empty dropdown renders 1334px panel with 5 recent transactions separated by thin vertical dividers and `#7A3CE8` purple `"Show 5 more"` link.
- [x] Query dropdown renders dual sections (`Jump to` with link/+ icons, `Help topics` with search icons) with exact matched substring bolding.
- [x] Footer strip displays `"Advanced transactions search"` blue link with `#F4F5F7` background.
- [x] Full `/search` results view renders All / Transactions / Help tabs with 3px green underline on active tab.
- [x] Blue-bordered dismissible info banner (`#0077C5`, `rounded-8`) renders with `X` button.
- [x] 5 filter controls (`Date range`, `Transaction type`, `Reference number`, `Contact`, `Amount`) render with filter chips row.
- [x] 9-column results table renders with correct uppercase headers, sort arrows, info circles, and exact mock transaction amounts.
- [x] Production build passes with 0 bundling errors.

---

# Part 7 — Integrations System & Notifications (§37–§40)

## §37. "My integrations" Popover (TopBar Apps Icon)

- **Trigger & Placement**:
  - Opened via the apps icon (with pink notification dot `#E31C5F`) in the topbar right cluster at `x≈1700`.
  - Right-anchored below the icon: `x: 1278–1712` (width `434px`), `y: 53–375` (height `322px`).
  - Styling: white background, `border: 1px solid #E3E5E8`, `border-radius: 8px`, `box-shadow: 0 8px 28px rgba(0,0,0,0.18)`, `z-index: 70`.
  - Mutually exclusive: opening closes search dropdown, notifications, and other menus. `Escape` or clicking outside dismisses.
- **Header**:
  - Left: `"My integrations"` (20px font-semibold `#393A3D`) + info circle `?` (16px `#6B6C72`, cursor pointer).
  - Right: close `X` (20px, `#6B6C72`).
- **3 App Tiles Row**:
  - 3 columns with centered app icons and status badges:
    1. **Shopify Connector**: 52×52px green logo with orange-red count badge (`#E8710A` with white `"1"`, 18px circle), title `"Shopify Connecto…"`.
    2. **Dext**: 52×52px logo with green connected check badge (`#2CA01C` with white `Check`, 18px circle), title `"Dext"`.
    3. **Online Back-up**: 52×52px teal restore clock logo with green connected check badge, title `"Online Back-up a…"`.
  - App titles truncated with ellipsis, max 2 lines, 14px `#393A3D`.
- **Integrations Overview Row**:
  - `LayoutGrid` icon (16px teal `#0E9F9F`) + `"Integrations overview"` link (15px font-medium `#0077C5`, hover underline).
- **Footer Strip**:
  - Full-width 62px bottom bar, background `#F4F5F7`, border-top `1px solid #E3E5E8`.
  - Centered button: `220×40px`, `rounded-8`, background `#EAF6E3`, border `1.5px solid #2CA01C`, text `#2CA01C` font-semibold 15px.
  - Content: `PlusCircle` icon (18px) + `"Find integrations"`.
  - Clicking button navigates directly to `/apps`.

---

## §38. "Find integrations" Full Page (`/apps`)

- **Route & Canvas**:
  - Route `/apps` (or `integrations_find`), full white canvas, max-width 1400px.
- **Tab Bar (y: 78–115)**:
  - `"Integrations overview"` (inactive) | `"Find integrations"` (active with 3px solid `#2CA01C` bottom border).
  - Full-width bottom separator `1px solid #D4D7DC`.
- **Hero Section (y: 180–275)**:
  - Headline: `"Save time and streamline your business with integrations"` (32px regular `#393A3D`, 2 lines, max-width 780px).
  - Action: `"Give Feedback"` button (`h: 44px`, 2px solid `#2CA01C` border, white bg, green text 15px font-semibold, `MessageSquare` icon).
- **Search & Filter Bar (y: 300–350)**:
  - Search input: `520×48px`, border `1px solid #8D9096`, rounded-4, `Search` icon 20px, placeholder `"Search by integration, tool or business need"`.
  - Vertical divider: `1px × 48px #D4D7DC`.
  - Dropdowns: `"Browse categories ⌄"` and `"Browse industries ⌄"` (each `h: 48px`, 2px solid `#2CA01C`, white bg, green text 15px font-semibold, `ChevronDown`).
- **Popular Searches Row (y ≈ 380)**:
  - Label: `"Popular searches:"` (15px `#393A3D`).
  - Links: `Stripe`, `Square`, `Paypal`, `Time`, `Amazon` (underlined `#0077C5`).
- **Featured Integrations Carousel (y: 460–795)**:
  - Header: `"Featured integrations"` (20px font-semibold `#393A3D`).
  - 4 cards visible (`290×335px`, gap 22px):
    - Top accent: `6px solid #2CA01C` bar across top edge with rounded top corners.
    - Border: `1px solid #C7CBCE`, `border-radius: 8px`, white background.
    - App Logo: 56×56px top-left.
    - Name: 18px font-semibold `#393A3D`.
    - Teal Star Rating: 5 stars (filled teal `#0E9F9F`, clipped fractional fill, empty outline) + review count `(183)`.
    - Description: 15px `#6B6C72`, line-height 1.4, up to 2 lines.
    - Badges (bottom): 24px circular badges (dark green `#0B6E4F` star for `fave`, navy `#2A3B8F` person for `pro`).
  - Navigation: left chevron `‹` (disabled at index 0) and right chevron `›` (active `#393A3D`).
- **Most Popular Integrations Section**:
  - Header: `"Most popular integrations"` (20px font-semibold) + `"View all"` blue link.
  - 4 cards: `Fundbox`, `Dext`, `Run`, `Fathom`.

---

## §39. Notifications Panel (Bell Icon)

- **Trigger & Placement**:
  - Triggered by Bell icon in topbar right cluster at `x≈1748`.
  - Right-anchored below the bell: `x: 1340–1760` (width `420px`), height `597px`.
  - Styling: white background, `border: 1px solid #E3E5E8`, `border-radius: 8px`, shadow `0 8px 28px rgba(0,0,0,0.18)`, `z-index: 70`.
- **Header**:
  - `"Notifications"` (20px font-semibold `#393A3D`) + close `X` (20px).
  - Divider: `1px solid #E3E5E8`.
- **Empty State**:
  - Custom SVG illustration (160×160px): green and white alternating canopy beach umbrella + folding lounge chair outline (`#9DA2A8`) + water/sand wave lines.
  - Copy: `"Nothing to see here!"` (20px regular `#393A3D`, centered).

---

## §40. Integrations JSON Dataset & Endpoints

- **Data Models**:
  - `myIntegrations`: Array of connected app objects `{ name, logoType, badge: { type, value } }`.
  - `featured`: Array of catalog items `{ id, name, rating, count, desc, badges }`.
  - `popular`: Array of top integrations.
- **REST Contract**:
  - `GET /integrations/connected` → User's active apps for popover.
  - `GET /integrations?featured=true` → Catalog items for marketplace.
  - `GET /notifications` → Notification items (returns empty array for empty state).

---

# Part 8 — Intuit Assistant Side Drawer (§41–§43)

## §41. Assistant Drawer Shell & Tabs

- **Trigger & Placement**:
  - Triggered via Help `?` icon in topbar right cluster (`x≈1838`).
  - Fixed right overlay: `x: 1283–1920` (width `637px`), full viewport height `0–960`, white background.
  - Shadow: `-4px 0 24px rgba(0,0,0,0.14)`, `z-index: 80`.
  - Overlay model: No background dimming — underlying application view remains interactive and independently scrollable.
- **Blue Header Band**:
  - Solid `#0077C5` blue header, height `85px`, flush top.
  - Title: `"Intuit Assistant"` with sparkles icon in white.
  - Close: white `X` button (22px) at `x≈1880, y≈32`.
- **Half-Width Dual Tabs (y: 85–141)**:
  - 1. **"Assistant"** (active):
     - Icon: teal circular spiral glyph (18px `#0E9F9F`) + `"Assistant"` 15px font-semibold.
     - Active indicator: `3px solid #2CA01C` green underline spanning the entire 50% tab half-width (`~318px`).
  - 2. **"Search"** (inactive):
     - Icon: `Search` 16px `#6B6C72` + `"Search"` 15px.
     - Displays search placeholder state when active.

---

## §42. Welcome State & Suggestion Chips

- **Centered Welcome Presentation**:
  - Title: `"Welcome"` (30px font-semibold `#393A3D`) centered at `y≈557`.
  - Subtitle: `"Here are a few things I can help you with."` (15px `#6B6C72`) centered at `y≈600`.
- **Suggestion Chips ×4**:
  - Width: full drawer minus padding (`w-full` in `px-5`), height `44px`, radius `8px`.
  - Background: pale cyan `#DFF3F8`, hover state `#CFE9F2`.
  - Text: 15px `#393A3D`, left-aligned with 16px horizontal padding.
  - Spacing: exact `25px` vertical gap between chips.
  - Exact Strings:
    1. `"How can I manually upload transactions?"`
    2. `"How can I import data to QuickBooks Online?"`
    3. `"How can I format CSV files for bank transactions?"`
    4. `"How do I connect my bank and credit card accounts?"`

---

## §43. Behavior, Chat Interaction & Full System Verification

- **Chat Interaction State**:
  - Clicking any suggestion chip immediately posts the text as a user message bubble (pale cyan `#DFF3F8`, right-aligned).
  - Simulated assistant response after 600ms providing actionable steps.
  - Composer input bar with send button at bottom.
- **Dismissal & Focus**:
  - `Escape` key or clicking `X` immediately slides drawer out of view.
- **Acceptance Checklist**:
  - [x] Apps icon opens `MyIntegrationsPopover` (434px wide) with 3 app tiles, badges, and `"Find integrations"` button.
  - [x] Bell icon opens `NotificationsPanel` (420px wide) with custom umbrella & chair empty illustration and `"Nothing to see here!"`.
  - [x] Clicking `"Find integrations"` or `"My apps"` in SideRail navigates to full `/apps` marketplace page.
  - [x] `/apps` features 32px headline, `"Give Feedback"` green button, search input, 2 green dropdowns, popular search links, 4 featured cards with 6px green top bars, teal stars, and badges.
  - [x] Help `?` icon slides out 637px Intuit Assistant drawer with solid `#0077C5` 85px header, half-width tabs with full green underline, centered welcome block, and 4 cyan suggestion chips.
  - [x] Suggestion chips trigger interactive conversational messages.
  - [x] Background page remains undimmed and fully interactive while Assistant drawer is open.
  - [x] Production build passes with 0 bundling errors.

---

# Part 9 — Gear Menu (Settings Mega-Dropdown) (§44–§46)

## §44. Panel & Column Grid (Gear Settings Mega-Menu)

- **Trigger & Placement**:
  - Opened via Gear (`Settings`) icon in the topbar right cluster.
  - Position: right-aligned under gear icon, `top: 56px`, `right: 16px`, anchored below topbar canvas.
  - Geometry (1x Normalized): `width: 890px`, `min-height: ~520px` (normalized from ~140% zoomed reference frame).
  - Styling: white background, `border: 1px solid #E3E5E8`, `border-radius: 8px`, `box-shadow: 0 8px 28px rgba(0,0,0,0.18)`, `z-index: 70`.
  - Presenter video overlay: Ignored per instruction.
  - Mutual exclusion: Closes notifications, integrations popovers, search dropdown; `Escape` or outside click dismisses.
- **4-Column Layout Grid**:
  - Grid template: `grid-template-columns: 205px 214px 225px 1fr; gap: 24px; padding: 28px 32px 24px;`.
  - Column headers: 13px font-semibold Inter, uppercase, tracking `0.06em`, color `#393A3D`, margin-bottom 16px.
  - Row items: height 35px, 15px `#393A3D`, rounded-4 hover background `#F6F7F8`, cursor pointer.
- **Column Items (Exact Order)**:
  1. **YOUR COMPANY**:
     - `Account and settings` (opens Account settings modal)
     - `Manage users`
     - `Custom form styles`
     - `Chart of accounts`
     - `Payroll settings`
     - `Workers' comp`
     - `Get the desktop app`
     - `Additional info` (muted text `#6B6C72`)
  2. **LISTS**:
     - `All lists`
     - `Products and services`
     - `Recurring transactions`
     - `Attachments`
     - `Custom fields`
     - `Rules`
  3. **TOOLS**:
     - `Order checks` (includes 14px `ExternalLink` icon `↗` in `#6B6C72`)
     - `Import data`
     - `Import desktop data`
     - `Export data`
     - `Reconcile`
     - `Budgeting`
     - `Audit log`
     - `Share screen`
     - `Resolution center`
  4. **PROFILE** (separated by left divider `1px solid #D4D7DC` / `border-l`):
     - `Subscriptions and billing`
     - `What's new`
     - `Feedback` (muted text `#6B6C72`)
     - `Privacy`

---

## §45. Footer & Workspace View Toggle

- **Divider**: Full-width separator `1px solid #D4D7DC`.
- **Footer Strip**:
  - Height: 64px, flex items centered, gap 8px, font 15px Inter `#0077C5`.
  - Element 1: `PlayCircle` icon (18px `#0077C5`) + `"Video tutorials"` (underlined link).
  - Divider: vertical pipe `|` in `#D4D7DC`.
  - Element 2 (View Toggle):
    - `"Switch "` + `<strong>from {accountantView ? "Accountant" : "Business"} view</strong>` (bold blue) + `" to {accountantView ? "Business" : "Accountant"} view"`.
    - Trailing `HelpCircle` icon (16px `#6B6C72`).
  - Interactivity: Clicking toggles workspace mode, flips bold text, and persists to `localStorage` (`qb_accountant_view`).
  - Navigation wiring: `"Account and settings"` opens the `AccountSettingsModal`; `"Chart of accounts"` navigates to banking; `"Budgeting"` opens budgets; `"Subscriptions and billing"` opens pricing.

---

## §46. JSON Dataset, Backend & Acceptance Checklist

- **Data Model**:
  ```json
  "settingsMenu": {
    "yourCompany": ["Account and settings", "Manage users", "Custom form styles", "Chart of accounts", "Payroll settings", "Workers' comp", "Get the desktop app", "Additional info"],
    "lists": ["All lists", "Products and services", "Recurring transactions", "Attachments", "Custom fields", "Rules"],
    "tools": [{ "label": "Order checks", "external": true }, "Import data", "Import desktop data", "Export data", "Reconcile", "Budgeting", "Audit log", "Share screen", "Resolution center"],
    "profile": ["Subscriptions and billing", "What's new", "Feedback", "Privacy"]
  }
  ```
- **Backend Endpoints**:
  - `GET /menu/settings` → Settings mega-menu structure.
  - `PATCH /me/preferences` → `{ accountantView: boolean }`.
- **Acceptance Checklist**:
  - [x] Gear icon opens 890px wide 4-column mega-dropdown right-aligned below topbar.
  - [x] Column headers rendered in 13px uppercase with 0.06em tracking.
  - [x] "Order checks" includes external link icon `↗`.
  - [x] "Additional info" and "Feedback" render in muted `#6B6C72`.
  - [x] Vertical divider line precedes PROFILE column.
  - [x] Footer features PlayCircle "Video tutorials" link and view toggle.
  - [x] Current view segment ("from Accountant view") is rendered in bold 600 weight and toggles interactively.
  - [x] "Account and settings" opens the Account & Settings modal.
  - [x] Production build passes with 0 bundling errors.

---

# Part 10 — Settings Company Tab & Edit Interactions (§47–§51)

## §47. Logo Uploader & Full Company Info Card

- **Logo Block**:
  - Position: centered at top of Company tab content (`x≈1073`, `y≈85–185`).
  - Tile: `96×96px`, `border-radius: 16px`, background `#F1F1F2`, border `1px solid #E3E5E8`.
  - Default Icon: `Store` / storefront glyph (52px `#393A3D`).
  - Edit Affordance: 44px white circle button (`border: 1px solid #D4D7DC`, shadow, overlapping bottom-right corner) with `Pencil` icon (18px `#393A3D`).
  - Interactive Upload: file input / image toggle replaces tile with custom image (e.g. schnauzer dog illustration).
- **Company Info Card**:
  - Title: `"Company info"` (24px font-semibold `#393A3D`).
  - Subtitle: `"This info may be connected to the Business Network or used for billing purposes."` (15px `#6B6C72`).
  - 6 Data Rows (height ~72px each, divider `1px solid #E3E5E8`):
    1. `Name`: `"Craig's Design and Landscaping Services"` (or `"Lawns & Paws"` post-save) | `Edit`
    2. `Address`: `"None listed"` | `Edit`
    3. `Email`: `"noreply@quickbooks.com"` | `Edit`
    4. `Phone`: `"None listed"` | `Edit`
    5. `Website`: `"None listed"` | `Edit`
    6. `Industry`: `"None listed"` | `Edit`
  - Values labeled `"None listed"` are rendered in muted `#6B6C72`.

---

## §48. Inline Edit Anatomy (Expanded Green-Border Box)

- **Expanded Row Geometry**:
  - Clicking `Edit` replaces the normal row with a form enclosed in a **`2px solid #2CA01C`** green border spanning the full card width.
- **Left Column**:
  - Width: ~260–280px.
  - Title: field label (15px font-semibold `#393A3D`).
  - Helper text: 14px `#6B6C72`, line-height 1.55, multi-line (e.g. for Name: *"Your public name or DBA. Shown on sales forms and purchase orders. Connected to the Business Network."*).
- **Right Column (Input Field)**:
  - Width: `455px`, height: `40px`.
  - Border: `2px solid #2CA01C`, `border-radius: 4px`, background `white`, 15px `#393A3D`.
  - Focus state: automatically focused with text content selected on open.
- **Actions Bar**:
  - Full-width divider `1px solid #E3E5E8`, margin-top 24px, padding-top 16px.
  - Buttons right-aligned:
    - `Cancel`: text button (`#2CA01C` green text, 15px font-semibold, hover underline).
    - `Save`: solid green button (`110×44px`, background `#2CA01C`, white text 15px font-semibold, `border-radius: 6px`, hover `#248817`).
- **State Machine**:
  - Only one row in edit mode at a time; clicking Cancel or pressing `Escape` reverts changes.

---

## §49. Select Variant & Business Type Dropdown

- **Legal Info Card**:
  - Title: `"Legal info"` (24px/600 `#393A3D`) + `"This is the info your business uses for tax purposes."` (15px `#6B6C72`).
  - Rows: `Legal business name` ("Lawns & Paws"), `EIN / SSN` ("None listed"), `Business type`, `Legal address` ("None listed").
- **Business Type Select Edit Mode**:
  - Enclosed in `2px solid #2CA01C` green border box.
  - Select trigger: `455×40px`, `border: 2px solid #2CA01C`, `border-radius: 4px`, flex items center, space between with chevron `⌄` (or `Check` inside right edge).
- **Overhanging Dropdown Menu**:
  - Width: `554px` (exceeds select field width leftward, anchored right).
  - Background: `white`, `border: 1px solid #E3E5E8`, `border-radius: 8px`, shadow `0 8px 24px rgba(0,0,0,0.15)`, `z-index: 40`.
  - 7 options (height ~48px each, 15px text):
    1. `Sole proprietor (Form 1040)`
    2. `Partnership or limited liability company (Form 1065)`
    3. `Small business corporation, two or more owners (Form 1120S)`
    4. `Corporation, one or more shareholders (Form 1120)`
    5. `Nonprofit organization (Form 990)`
    6. `Limited liability`
    7. `Not sure/Other/None`
  - Active/selected row displays a green checkmark `✓` (`#2CA01C`) prefix.
  - Selecting an option updates the select box, closes dropdown menu, and keeps the green edit box open until Save or Cancel is clicked.

---

## §50. Row Hover Highlight & Optimistic Save Flow

- **Row Hover Color Token**:
  - Hovering any settings row highlights the entire row with a light blue tint: **`#E8F0FB`** (pale periwinkle/blue, NOT gray).
  - CSS rule: `.setting-row:hover { background-color: #E8F0FB; }`.
- **Optimistic Save Flow**:
  - Editing Name (e.g. from `"Craig's Design and Landscaping Services"` to `"Lawns & Paws"`) and clicking `Save` immediately collapses the edit box, updates row text, and broadcasts new company name to topbar logo cluster without page reload.

---

## §51. Backend Endpoints & Master Acceptance Checklist

- **REST Endpoints**:
  - `PATCH /company/company-info` → `{ name, address, email, phone, website, industry }`.
  - `PATCH /company/legal-info` → `{ legalName, ein, businessType, legalAddress }`.
  - `POST /company/logo` → multipart upload, square crop, persists logo URL.
- **Acceptance Checklist**:
  - [x] Logo uploader renders 96px tile with 44px pencil circle button overlapping bottom-right.
  - [x] Company info card renders 6 rows with exact values and "None listed" placeholders.
  - [x] Clicking "Edit" expands row into 2px green border box with 260px helper column and 455px input.
  - [x] Input automatically focuses and selects all text upon opening.
  - [x] Cancel is rendered as green text button; Save is rendered as 110×44px solid green button.
  - [x] Business type select opens 554px wide right-aligned dropdown with 7 tax form options and green checkmark.
  - [x] All settings rows display pale blue hover background `#E8F0FB`.
  - [x] Saving updates row value and header company name optimistically.
  - [x] Production build passes with 0 bundling errors.

---

# Part 11: Settings Usage Tab & Plan Limits

## §52. Usage Tab Layout & Nav States
- **Nav Refinement (Reusable across all Settings tabs)**:
  - **Active State**: Light gray rounded background (`#E3E5E8`), dark text (`#393A3D` 15px font-semibold), plus **`4px solid #2CA01C`** green bar at the left edge.
  - **Hover State (Inactive)**: Light gray rounded background (`#EDEDEF`), no green bar.
  - **Tabs Available**: `Company`, `Usage` (active), `Sales`, `Expenses`, `Time`, `Advanced`.
- **Content Geometry**:
  - Usage tab content is left-aligned (not centered like Company tab).
  - Content region spans `x:262–1232` (max-width `970px`).
  - Title: `"Usage limits"` (`32px` font-semibold `#393A3D`, `x:262, y≈112`).
  - Intro Paragraph:
    `"Beginning April 2019, usage limits will go into effect and will depend on your plan. Your current plan is QuickBooks Online Plus. Upgrade to have greater capacity, or learn how to manage to these limits."`
    (15px `#393A3D`, 3 lines, max-width `590px`).
  - Documentation link: `"Find out more about usage limits"` (`15px #0077C5`, blue, underlined, `y≈247`).
- **Meter Block Container**:
  - Width: `654px` (`x:268–922`).

---

## §53. UsageMeter Component
- **Component Anatomy**:
  - **Header Row**:
    - Label: `20px` font-semibold `#393A3D` + `Info` circle icon (`16px #6B6C72`, inline margin-left 8px).
    - Usage Count: right-aligned on same row, `used` (`15px` font-bold `#393A3D`) + `" OF "` + `limit` (`13px #6B6C72` font-semibold uppercase).
  - **Progress Bar**:
    - Dimensions: `654×10px`, `border-radius: 999px` (pill).
    - Track background: `#CDD0D4` (light gray).
    - Fill bar: charcoal slate `#454A52`, `border-radius: 999px`.
    - Warning threshold (inferred): when `used / limit >= 0.9`, fill turns red `#C0392B`.
  - **Usage Link & Limit Line**:
    - Link: `"{used} {unit}"` (`14px #0077C5`, font-semibold, hover underline, e.g. `"1 user(s)"`, `"44 account(s)"`).
    - Subtext: `"The limit for your plan is {limit}."` (`15px #6B6C72`).
  - **Dividers**:
    - `1px solid #E3E5E8` between meters (margin ~32px).
- **Tab Footer Links**:
  - `"Privacy | Security | Terms of Service"`:
    - 15px `#0077C5` blue links with muted `|` (`#6B6C72`) separators.
    - Right-aligned to content edge (`x:1232`, `y≈738`).

```tsx
function UsageMeter({ label, used, limit, unit, href }: MeterProps) {
  return (
    <section className="usage-meter w-full max-w-[654px]">
      <header className="flex justify-between items-center">
        <h3 className="text-[20px] font-semibold text-[#393A3D] flex items-center">
          {label} <Info size={16} className="text-[#6B6C72] ml-2" />
        </h3>
        <span className="count">
          <b className="text-[15px] font-bold text-[#393A3D]">{used}</b>
          <span className="text-[13px] font-semibold text-[#6B6C72] uppercase ml-1">OF {limit}</span>
        </span>
      </header>
      <div className="w-full h-[10px] rounded-full bg-[#CDD0D4] my-[14px]">
        <div
          className={`h-full rounded-full ${used / limit >= 0.9 ? 'bg-[#C0392B]' : 'bg-[#454A52]'}`}
          style={{ width: `${(used / limit) * 100}%` }}
        />
      </div>
      <a className="text-[14px] font-semibold text-[#0077C5] hover:underline" href={href}>
        {used} {unit}
      </a>
      <p className="text-[15px] text-[#6B6C72] mt-1">The limit for your plan is {limit}.</p>
    </section>
  );
}
```

---

## §54. Data Schema, Company Confirmation & Master Checklist
- **Usage Data Schema (`/company/usage`)**:
  ```json
  "usage": {
    "plan": "QuickBooks Online Plus",
    "meters": [
      {
        "key": "billableUsers",
        "label": "Billable Users",
        "used": 1,
        "limit": 5,
        "unit": "user(s)",
        "href": "/manage-users"
      },
      {
        "key": "chartOfAccounts",
        "label": "Chart of accounts",
        "used": 44,
        "limit": 250,
        "unit": "account(s)",
        "href": "/chart-of-accounts"
      }
    ]
  }
  ```
- **Company Tab Data Confirmation**:
  - Legal info card: Legal business name `"Lawns & Paws"`, EIN/SSN `"None listed"`, Business type `"Corporation, one or more shareholders (Form 1120)"`, Legal address `"None listed"`.
  - Customer contact info card: Customer email `"noreply@quickbooks.com"`, Customer address `"None listed"`, Customer phone `"None listed"`.
- **Acceptance Checklist (Part 11)**:
  - [x] Usage tab nav item active displays `#E3E5E8` rounded background + `4px` green left edge bar `#2CA01C`.
  - [x] Inactive tab items display `#EDEDEF` hover state without green bar.
  - [x] "Usage limits" header rendered at 32px with 3-line intro copy and blue underlined link.
  - [x] Meter blocks constrained to 654px width.
  - [x] Billable Users displays `1 OF 5` with 20% charcoal bar, "1 user(s)" blue link, and limit 5 text.
  - [x] Chart of accounts displays `44 OF 250` with 17.6% charcoal bar, "44 account(s)" blue link, and limit 250 text.
  - [x] Dividers separate meter sections.
  - [x] Footer legal links ("Privacy | Security | Terms of Service") right-aligned to 970px content boundary.
  - [x] Build passes with 0 errors.

---

# Part 12: Sales, Expenses, Time & Advanced Settings Tabs

## §55. Advanced Tab Layout & Card Pattern B
- **Geometry & Alignment**:
  - Content region spans full width up to `max-w-[1544px]` (`x:293–1837`).
  - Cards stack vertically with `24px` (`gap-6` / `space-y-6`) separation.
  - Footer legal links (`SettingsFooterLinks`) right-aligned at bottom margin `88px`.
- **Card Pattern B Anatomy**:
  - Unlike the Company tab (which has row-level green border inline expansion), Advanced tab cards use **Card Pattern B**:
    - **Header Row**: `h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between`.
    - **Card Title**: `20px` font-semibold text `#393A3D`.
    - **Top-Right Action**: `"Edit"` text button in QuickBooks green (`#2CA01C` 15px font-medium hover:underline).
    - **Divider**: `1px solid #E3E5E8` separating header from content.
    - **Card Body**: Normal state contains 1–4 label-value rows divided by `1px solid #F0F1F3`. Label column width `380px` (or `w-[260px]`), value text `15px font-semibold #393A3D`.
- **Complete Inventory of 10 Advanced Cards (Exact Order)**:
  1. **Accounting method**: Header + Edit button. Content: `"Accrual"` (interactive edit flow).
  2. **Customer label**: Header + Edit button. Content: `"Customers"`.
  3. **Communications with Intuit**: Header only (**NO Edit button**). Content: blue link `"Marketing preferences"` (`#0077C5`).
  4. **Accounting**: Header + Edit button. Content (4 rows):
     - First month of fiscal year: `"January"`
     - First month of tax year: `"Same as fiscal year"`
     - Accounting method: `"Accrual"` (or current setting)
     - Close the books: `"Off"`
  5. **Chart of accounts**: Header + Edit button. Content: `"Enable account numbers — Off"`.
  6. **Automation**: Header + Edit button. Content (3 rows):
     - Automatically apply credits: `"On"`
     - Automatically invoice unbilled activity: `"Off"`
     - Automatically apply bill payments: `"On"`
  7. **Projects**: Header + Edit button. Content: `"Organize all job-related activity in one place — Off"`.
  8. **Currency**: Header + Edit button. Content (2 rows):
     - Home Currency: `"United States Dollar"`
     - Multicurrency: `"Off"` (interactive edit flow with disclosure gate).
  9. **Business Network**: Header + Edit button. Content: `"Allow members to find me — On"`.
  10. **Other preferences**: Header + Edit button. Content (4 rows):
      - Date format: `"mm/dd/yyyy"`
      - Currency format: `"$123,456.00"`
      - Customer label: `"Customers"`
      - Warn me if duplicate check number is used: `"On"`

---

## §56. Advanced Card Edit Variant B & Currency Multicurrency Disclosure Flow
- **Edit Variant B Interaction Rules**:
  - Edit controls replace the normal card content within the existing card frame (no full-card green border wrap).
  - Actions row at bottom: `border-t border-[#E3E5E8] pt-5 flex items-center space-x-6`.
  - **Left-Aligned Buttons**:
    - `"Cancel"`: Green text link (`15px font-semibold text-[#2CA01C] hover:underline`).
    - `"Save"`: Solid QuickBooks green pill/button (`113×38px`, `rounded-[6px] bg-[#2CA01C] hover:bg-[#248817] text-white font-semibold text-[15px]`).
- **Accounting Method Inline Edit**:
  - Dropdown trigger: `213×38px` input-style button with `2px solid #2CA01C` green border, white background, right chevron.
  - Dropdown menu: `213px` width, items `"Accrual"` and `"Cash"`, with green checkmark on active item.
  - Information icon: `20×20px` circle with `ⓘ` tooltip.
  - Saving updates method in both Card 1 and Card 4, and triggers canonical toast.
- **Currency Card Multicurrency Disclosure Flow (Screenshots 1–3)**:
  - **Home Currency Row**: Non-editable display/select `USD - United States ...` (`213×38px`, border `#D4D7DC`).
  - **Multicurrency Toggle**:
    - Track: `44×24px rounded-full`, background `#CDCFD3` (inactive) / `#2CA01C` (active).
    - Thumb: `20×20px rounded-full bg-white shadow-md`, animated slide `20px`.
    - Information icon: `18×18px` circle with `ⓘ` tooltip.
  - **Disclosure Rules (When Toggle is Switched ON)**:
    - Automatically unfolds the warning disclosure section below the toggle.
    - Intro text: `"Multicurrency may be right for you if you have financial transactions in more than one currency."`
    - Blue link: `"Need help deciding about multicurrency?"` (`#0077C5`).
    - Warning list: `"Once you turn on Multicurrency:"`
      - • *You can't turn it off*
      - • *You can't change your home currency*
      - • *Extra fields, columns and more are added to QuickBooks*
      - • *Some features may no longer be available*
    - Mandatory checkbox: `[ ] I understand I can't undo Multicurrency` (`text-[#2CA01C]`).
    - **CRITICAL ENFORCEMENT**: The Save button is strictly **DISABLED** (`bg-[#86D47B] cursor-not-allowed opacity-80`) until the user checks this checkbox! Once checked, Save becomes active (`bg-[#2CA01C] hover:bg-[#248817] cursor-pointer`).

---

## §57. Canonical "Settings saved" Toast Notification
- **Banner Geometry & Tokens**:
  - Modal-level fixed banner positioned top-center: `top-[14px] left-1/2 -translate-x-1/2`.
  - Dimensions: `512×57px` (`w-[512px] h-[57px]`).
  - Background: Pure white `#FFFFFF`, `rounded-[4px]`.
  - Shadow: `shadow-[0_2px_8px_rgba(0,0,0,0.20)]`.
  - Border: Subtle `1px solid #F0F1F3`.
  - Z-Index: `z-50` floating over header content.
- **Banner Elements**:
  - Left icon: `CheckCircle2` (`20px`, solid green `#2CA01C`, stroke width 2).
  - Status text: `"Settings saved"` (`15px font-medium text-[#393A3D]`).
  - Right action: `"Close"` (`15px text-[#0077C5] hover:underline cursor-pointer ml-auto`).
- **Triggering Points**:
  - Triggers upon saving Company Name, Business Type, Accounting Method, or Currency settings.

---

## §58. Sales, Expenses & Time Tabs Layout
- **Sales Tab**:
  - 5 canonical sections matching standard QuickBooks Online:
    1. *Sales form content*: Preferred invoice terms (Net 30), Preferred delivery method (Print later), Shipping (Off), Custom fields, Custom transaction numbers (Off), Service date (Off), Discount (On), Deposit (Off), Accept tips (Off), Tags (On).
    2. *Products and services*: Show Product/Service column (On), Show SKU column (Off, indented +33px), Turn on price rules (Off, dotted blue link), Track quantity and price/rate (On), Track inventory quantity on hand (On).
    3. *Late fees*: Default charge applied to overdue invoices (Off), with 2-line helper: `Appears as a line under Product/Service on the invoice...`.
    4. *Progress Invoicing*: Create multiple partial invoices from a single estimate (Off).
    5. *Messages*: Default email message sent with sales forms.
  - Section header width `210px`, label width `428px`, row height pitch `37px`, top-right pencil buttons.
- **Expenses Tab**:
  - Centered card container: `max-w-[1553px] mx-auto bg-white border border-[#E3E3E3] rounded-[8px] shadow-[0_1px_5px_rgba(0,0,0,0.12)]`.
  - Header: `h-[72px] pl-[22px] pr-[56px]`, title `"Expenses"` (`24px font-bold #393A3D`), top-right `"Edit"` link (`16px font-semibold text-[#2CA01C]`).
  - 3 sections inside:
    1. *Bills and expenses* (Show Items table On, Show Tags On, Track expenses by customer On, Make expenses billable On, Default bill payment terms).
    2. *Purchase orders* (Use purchase orders On).
    3. *Messages* (Default email message sent with purchase orders).
- **Time Tab**:
  - 2 canonical sections:
    1. *General*: First day of work week (`Monday`, `48px` pitch).
    2. *Timesheet*: Show service field (`On`), Allow time to be billable (`On`, `54px` pitch).

---

## §59. Master Acceptance Checklist (Parts 10–12)
- [x] Company Tab: Logo uploader with storefront icon / schnauzer toggle and 44px pencil edit circle.
- [x] Company Tab: Company info card with 6 rows (Name, Address, Email, Phone, Website, Industry).
- [x] Company Tab: Name inline edit with 2px green border, autoselected input, Cancel / Save buttons.
- [x] Company Tab: Legal info card with 4 rows and 554px right-aligned Business type dropdown menu.
- [x] Company Tab: Customer contact info card with 3 rows.
- [x] Usage Tab: Active nav state with `#E3E5E8` background and `4px solid #2CA01C` left indicator.
- [x] Usage Tab: Left-aligned content with 32px title, 3-line description, and blue link.
- [x] Usage Tab: Billable Users (`1 OF 5`) and Chart of accounts (`44 OF 250`) pill meters with 654px width constraint.
- [x] Sales Tab: 5 sections, 37px pitch, indented SKU, dotted price rules link, 2-line late fee description.
- [x] Expenses Tab: Centered 1553px card with 72px header, bold title, and green Edit button.
- [x] Time Tab: General and Timesheet sections with 48px and 54px row pitches.
- [x] Advanced Tab: 1544px wide Card Pattern B layout across 10 canonical cards in exact order.
- [x] Advanced Tab: Accounting method inline dropdown with Accrual / Cash options and left-aligned Cancel/Save.
- [x] Advanced Tab: Currency card Multicurrency toggle with 4-item warning disclosure.
- [x] Advanced Tab: Mandatory checkbox gating Save button (disabled until checked).
- [x] Canonical Toast: 512×57px top-center "Settings saved" notification with green checkmark and Close link.
- [x] Production build passes with 0 bundling errors.

---

# Part 13: Chart of Accounts Page Replication

## §60. Navigation & Page Architecture
- **Navigation Topology**:
  - Primary Rail (84px): Pinned "Accounting" tile (`#2CA01C` 28px square, y≈580) directly opens `chart_of_accounts`.
  - Secondary Sidebar (263px, `#F4F5F8`, `border-r border-[#E3E5E8]`):
    - Header: `"MY APPS"` (`12px font-semibold text-[#6B6C72] uppercase tracking-[1.2px]`) + sliders icon at right.
    - Group 1: `"Accounting"` (expanded by default, chevron up, `#00352C` circle with green `A` glyph).
    - Sub-items:
      - `Bank transactions` (y≈176)
      - `Integration transactions` (y≈220)
      - `Receipts` (y≈264)
      - `Reconcile` (y≈308)
      - **`Rules`** (y≈352 — confirmed from screenshot)
      - **`Chart of accounts` — ACTIVE STATE**: `h-[38px] rounded-full bg-[#E0E3E8] text-[#393A3D] font-semibold pl-[46px] my-1`
      - `Recurring transactions` (y≈443)
      - `My accountant` (y≈487)
    - Groups 2–9 (20px circular badges + label + chevron down):
      - Expenses & Bills (`#0AA574`), Sales & Get Paid (`#005E5D`), Customer Hub (`#2E9E5B`), Team (`#12A489`), Time (`#00352C`), Sales Tax (`#E5346B`), Business Tax (`#83243F`), Lending (`#0AA574`).
    - Pinned bottom row: `border-t border-[#D9D9D9]`, then `Payroll` (`#12141D` circle with `P`, gem icon at right).
- **Page Header & Top Action Cluster**:
  - Title: `"Chart of accounts"` (`28px font-bold text-[#393A3D]`).
  - Back link: `"< All lists"` (`15px text-[#0077C5] hover:underline flex items-center gap-1.5`).
  - Top-Right Action Cluster:
    - `"Feedback"`: speech bubble outline + text (`15px text-[#393A3D]`).
    - `"Run report"`: `h-[38px] px-[18px] border-[1.5px] border-[#2CA01C] text-[#2CA01C] font-semibold rounded-[4px] hover:bg-[#F0FAF0]`.
    - `"New account"`: Split button `h-[38px] rounded-[4px] overflow-hidden`:
      - Main button: `bg-[#2CA01C] text-white px-[16px] font-semibold hover:bg-[#25900F]`.
      - Divider: `1px solid #1E7A14`.
      - Dropdown chevron: `bg-[#2CA01C] text-white w-[42px] hover:bg-[#25900F]`.

---

## §61. Sticky Header & Scroll Behavior (Screenshots 1 & 2)
- **Sticky Table Header (Screenshot 2 Confirmation)**:
  - Header row height: `50px`.
  - Positioning: `sticky top-0 bg-white z-10 border-b border-[#D9D9D9]`.
  - Behavior: When the user scrolls the page down, the table header pins directly beneath the topbar (y≈52–102), while the page title, back link, toolbar, and pagination scroll out of view. Table rows glide cleanly beneath the sticky header!
- **Column Geometry (Total Width ~1492px)**:
  - Checkbox: `46px` (centered-left checkbox at x≈399).
  - `NAME`: `311px` (sortable ⇅, border-r rule `#E3E5E8` at x≈745).
  - `ACCOUNT TYPE`: `254px` (sortable ⇅, `(?)` tooltip icon, border-r rule `#E3E5E8` at x≈993).
  - `DETAIL TYPE`: `287px` (sortable ⇅, border-r rule `#E3E5E8` at x≈1280).
  - `QUICKBOOKS BALANCE`: `207px` (sortable ⇅, header left-aligned, numbers right-aligned, border-r rule `#E3E5E8` at x≈1487).
  - `BANK BALANCE`: `153px` (sortable ⇅, header left-aligned, numbers right-aligned, border-r rule `#E3E5E8` at x≈1640).
  - `ACTION`: `minmax(200px, 1fr)` (link at x≈1672, chevron button at x≈1825).

---

## §62. Full Inventory of 25 Accounts & Visual Badges
- **Row Pitch & Hover**:
  - Row height: `59px`.
  - Border: `1px solid #E8EAEC`.
  - Hover: subtle `#F7F8FA` background.
  - Selected state: `#EEF2F5` highlight.
- **Hierarchical Indentation & Tree Guide Line**:
  - `indent: 0`: padding-left `10px` (x≈444).
  - `indent: 1`: padding-left `46px` (x≈480).
  - `indent: 2`: padding-left `62px` (x≈496).
  - Child rows display a continuous vertical tree guide line: `2px solid #E0E2E6` at `left: 28px` (x≈462), spanning full row height.
- **Badges & Glyphs**:
  - `BAL` Badge: `bg-[#2CA01C] text-white text-[11px] font-bold px-[7px] py-[3px] rounded-[3px]`, right-aligned in Account Type column.
  - `P&L` Badge: `bg-[#0077C5] text-white text-[11px] font-bold px-[7px] py-[3px] rounded-[3px]`, right-aligned in Account Type column.
  - Bank Exchange Glyph (`⇄`): Displayed before type text and detail text for Bank accounts (`Checking`, `Savings`).
- **Complete Accounts Table**:
  1. `Checking` (Bank, BAL, ⇄ Checking, $1,201.00, -$3,621.93, View register, indent: 0)
  2. `Savings` (Bank, BAL, ⇄ Savings, $800.00, $200.00, View register, indent: 0)
  3. `Accounts Receivable (A/R)` (Accounts receivable (A/R), BAL, Accounts Receivable (A/R), $5,281.52, —, View register, indent: 0)
  4. `Inventory Asset` (Other Current Assets, BAL, Inventory, $596.25, —, View register, indent: 0)
  5. `Prepaid Expenses` (Other Current Assets, BAL, Prepaid Expenses, $0.00, —, View register, indent: 0)
  6. `Uncategorized Asset` (Other Current Assets, BAL, Other Current Assets, $0.00, —, View register, indent: 0)
  7. `Undeposited Funds` (Other Current Assets, BAL, Undeposited Funds, $2,062.52, —, View register, indent: 0)
  8. `Truck` (Fixed Assets, BAL, Vehicles, $13,495.00, —, View register, indent: 0)
  9. `Depreciation` (Fixed Assets, BAL, Accumulated Depreciation, $0.00, —, View register, indent: 1)
  10. `Original Cost` (Fixed Assets, BAL, Vehicles, $13,495.00, —, View register, indent: 1)
  11. `Retained Earnings` (Equity, BAL, Retained Earnings, —, —, Run report, indent: 0)
  12. `Billable Expense Income` (Income, P&L, Service/Fee Income, —, —, Run report, indent: 0)
  13. `Design income` (Income, P&L, Other Primary Income, —, —, Run report, indent: 0)
  14. `Discounts given` (Income, P&L, Discounts/Refunds Given, —, —, Run report, indent: 0)
  15. `Fees Billed` (Income, P&L, Service/Fee Income, —, —, Run report, indent: 0)
  16. `Landscaping Services` (Income, P&L, Other Primary Income, —, —, Run report, indent: 0)
  17. `Job Materials` (Income, P&L, Other Primary Income, —, —, Run report, indent: 1)
  18. `Decks and Patios` (Income, P&L, Other Primary Income, —, —, Run report, indent: 2)
  19. `Fountains and Garden Lighting` (Income, P&L, Other Primary Income, —, —, Run report, indent: 2)
  20. `Plants and Soil` (Income, P&L, Other Primary Income, —, —, Run report, indent: 2)
  21. `Sprinklers and Drip Systems` (Income, P&L, Other Primary Income, —, —, Run report, indent: 2)
  22. `Labor` (Income, P&L, Other Primary Income, —, —, Run report, indent: 1)
  23. `Installation` (Income, P&L, Other Primary Income, —, —, Run report, indent: 2)
  24. `Maintenance and Repair` (Income, P&L, Other Primary Income, —, —, Run report, indent: 2)
  25. `Other Income` (Income, P&L, Other Primary Income, —, —, Run report, indent: 0)

---

## §63. Interactivity & Dropdown Workflows
- **Batch Actions Menu**:
  - Gated by checkbox selection: `Edit` and `Make inactive` are disabled until ≥ 1 row is selected.
- **Search & Filter**:
  - Input with search magnifier live-filters table across name, account type, and detail type.
  - "All" dropdown provides full type filtering across all 6 account types + "All".
- **Column Sorting**:
  - Clicking any sortable header (`NAME`, `ACCOUNT TYPE`, `DETAIL TYPE`, `QUICKBOOKS BALANCE`, `BANK BALANCE`) sorts the dataset ascending/descending with visual arrow feedback. Empty balances sort last.
- **Row Action Context Menu**:
  - Clicking row chevron down rotates 180° and opens action context menu (`View register` / `Run report`, `Edit`, `Make inactive`).

---

## §64. Master Acceptance Checklist (Part 13)
- [x] Secondary navigation sidebar (263px) with MY APPS, expanded Accounting, confirmed Rules sub-item, and active Chart of accounts pill (`#E0E3E8`).
- [x] Page header with 28px bold title, `< All lists` link, Feedback, Run report (green outline), and New account split button.
- [x] Toolbar with Batch actions (selection-gated), live search input, "All" account type dropdown, and action icon trio.
- [x] Sticky table header pins below topbar on scroll with 100% fidelity to Screenshot 2.
- [x] All 25 accounts rendered with exact screenshot numbers, negative balances (`-$3,621.93`), indents, tree guide lines, and BAL/P&L badges.
- [x] Row action chevrons with interactive context dropdown menu.
- [x] Wired to App.jsx routing and SideRail Accounting tile navigation.
- [x] Production build passes with 0 bundling errors.

---

# Part 14: Rules Tab & "Create rule" Slide-Over Drawer

## §65. Rules Page Architecture & Empty State Table
- **Navigation & Topology**:
  - Secondary Sidebar ($263\text{px}$, `#F4F5F8`):
    - `Accounting` group expanded by default.
    - **`Rules` Active State**: rounded-full pill background (`#E0E3E8`), $h = 38\text{px}$, $x \approx 95\text{--}328$, text `#393A3D` font-semibold.
    - `Sales & Get Paid` group expanded with sub-items: `Overview`, `Sales transactions`, `Invoices`, `Sales orders`, `Sales channels`, `QuickBooks payouts`, `Channel payouts`, `Products & services`.
- **Page Header**:
  - Title: `"Rules"` ($28\text{px}$ font-bold `#393A3D`, $x \approx 388, y \approx 105$).
  - Top Action Cluster:
    - `"📖 Learn about bank rules"` ($15\text{px} \text{ #0077C5}$ link with open book glyph).
    - `"New rule"` Split Button ($h = 38\text{px}$):
      - Solid green primary button (`#2CA01C`, white text, $15\text{px}$ font-semibold, hover `#248817`).
      - $1\text{px}$ divider (`rgba(255,255,255,0.4)` / `#1E7A14`).
      - Chevron dropdown trigger ($42\text{px}$ width).
- **Search & Settings Toolbar** ($y \approx 195\text{--}235$):
  - Right-aligned search bar: $w \approx 320\text{px}, h \approx 38\text{px}$, white background, border `#8D9096`, placeholder `"Search by name or conditions"`, magnifier icon 🔍 on the right.
  - Settings gear icon ($36\times 36\text{px}$ round button with `#6B6C72` gear).
- **Table Structure & Exact Columns (Screenshot 2)**:
  - Header height: $48\text{px}$, uppercase $13\text{px}$ font-semibold `#393A3D`, top and bottom borders `#D9D9D9`.
  - Column Widths:
    1. Checkbox: $46\text{px}$
    2. `PRIORITY`: $140\text{px}$ (active sort with solid black triangle $\blacktriangle$ and `(?)` tooltip icon).
    3. `RULE NAME`: $180\text{px}$
    4. `APPLIED TO`: $180\text{px}$
    5. `CONDITIONS`: $320\text{px}$
    6. `SETTINGS`: $280\text{px}$
    7. `AUTO-ADD`: $110\text{px}$
    8. `STATUS`: $90\text{px}$
    9. `ACTIONS`: $\text{minmax}(130\text{px}, 1\text{fr})$
  - Column vertical divider rules: $1\text{px solid #E3E5E8}$.
- **Pagination (Empty State)**:
  - Text: `"0-0 of 0 items"` ($14\text{px} \text{ #6B6C72}$).
  - Controls: `‹` (disabled `#C1C5CA`), `1` (active page badge `#E0E3E8`), `›` (disabled `#C1C5CA`).

---

## §66. "Create rule" Slide-Over Drawer (§Screenshot 1)
- **Geometry & Backdrop**:
  - Width: $670\text{px}$ fixed on right viewport edge ($x \approx 1250\text{--}1920$, $100\%$ height).
  - Background: Pure white `#FFFFFF` with elevation shadow.
  - Backdrop: `rgba(0,0,0,0.25)` dim overlay across main canvas and navigation.
  - Header: $64\text{px}$, title `"Create rule"` ($24\text{px}$ font-semibold `#393A3D`), close button `✕` ($20\text{px}$) at top-right.
- **Form Controls & Validation States**:
  - **Subtitle**: `"Rules only apply to unreviewed transactions."` ($14\text{px} \text{ #6B6C72}$).
  - **Rule Name Input (Validation Error State)**:
    - Label: `"What do you want to call this rule? *"`
    - Input: $h = 40\text{px}$, light pink background (`#FDEDED`), red border (`#D32F2F`), placeholder `"Name this rule"`.
    - Error banner below: Red warning triangle ⚠️ + `"Rule name is required."` ($13\text{px} \text{ #D32F2F}$).
  - **Transaction Direction & Bank Accounts**:
    - Label: `"Apply this to transactions that are"`
    - Inline pair: `[ Money out ⌄ ]` + `"in"` + `[ All bank accounts ⌄ ]` ($h = 40\text{px}$ each).
  - **Conditions Builder**:
    - Header: `"and include the following:"` + dropdown `[ All ⌄ ]` / `[ Any ⌄ ]`.
    - Condition row (3 controls):
      - Field select: `[ Description ⌄ ]` (`Description`, `Bank text`, `Amount`).
      - Operator select: `[ Contains ⌄ ]` (`Contains`, `Doesn't contain`, `Is exactly`).
      - Value input: `[ Enter text (required) ]` ($h = 40\text{px}$, border `#8D9096`).
    - Link: `+ Add a condition` ($14\text{px} \text{ #0077C5}$ font-semibold hover:underline).
  - **"Test rule" Button**:
    - $h = 38\text{px}$, border $1.5\text{px}$ green `#2CA01C`, green text, rounded $4\text{px}$, hover `#F0FAF0`.
  - **"Then Assign ⌄" Accordion Section**:
    - Header: `"Then "` + bold blue `"Assign"` + blue chevron `⌄`.
    - Fields:
      - `Transaction type`: `[ Expense ⌄ ]` ($w \approx 340\text{px}$).
      - `Category`: `[ Select a category ⌄ ]` ($w \approx 340\text{px}$).
      - `Product/service`: `[ Select product/service ⌄ ]` ($w \approx 340\text{px}$).
      - Link: `+ Add a split` ($14\text{px} \text{ #0077C5}$).
      - `Payee`: `[ (Recommended) ⌄ ]` ($w \approx 340\text{px}$).
      - Toggle switch: `"Automatically confirm transactions this rule applies to"` ($44\times 24\text{px}$ pill toggle).
  - **Footer Action Bar**:
    - Sticky bottom bar ($h = 72\text{px}$, border-top `#E3E5E8`).
    - Left: `"Cancel"` blue link ($15\text{px} \text{ #0077C5}$ hover:underline).
    - Right: `"Save"` solid QuickBooks green button ($h = 40\text{px}$, `bg-[#2CA01C] text-white font-semibold rounded-[6px]`).

---

## §67. Master Acceptance Checklist (Part 14)
- [x] Secondary navigation sidebar with active Rules pill (`#E0E3E8`) and expanded Sales & Get Paid group.
- [x] Rules page header with 28px title, "Learn about bank rules" link, and green "New rule" split button.
- [x] Toolbar with search input ("Search by name or conditions") and settings gear button.
- [x] Rules table with exact 9 columns (Priority with upward triangle and info glyph, Rule Name, Applied To, Conditions, Settings, Auto-Add, Status, Actions) and column vertical rules.
- [x] Empty state display with "0-0 of 0 items" pagination.
- [x] "Create rule" slide-over drawer (670px) opening on "New rule" click.
- [x] Red validation error state for empty rule name with warning triangle icon.
- [x] Condition builder with field, operator, value inputs, and working "+ Add a condition".
- [x] "Test rule" button with feedback.
- [x] "Then Assign ⌄" accordion section with Transaction type, Category, Product/service, + Add a split, and Payee.
- [x] Working Cancel and Save actions saving new rules into the table.
- [x] Production build passes with 0 bundling errors.












---

# PART 15: PRODUCTS & SERVICES, RECURRING TRANSACTIONS, & ADDITIONAL INFORMATION MODAL

## § 68. "Additional information" Modal Architecture (Screenshot 4)
- **Geometry & Topology**:
  - Modal Dimensions: $837 \times 831\text{px}$ centered in viewport.
  - Border & Elevation: $1\text{px solid #E3E5E8}$, `rounded-[8px]`, `shadow-[0_12px_44px_rgba(0,0,0,0.25)]`, background pure white `#FFFFFF`.
  - Backdrop: Light transparent overlay (`rgba(0,0,0,0.25)`), allowing background Chart of Accounts / application state to remain crisp and readable.
  - Global Invocation: Triggered by clicking the TopBar `?` button or pressing `?` / `/` on keyboard (when focus is outside form inputs).
- **Header & Company Identifier**:
  - Close button: `×` glyph at top right ($20\text{px}$, `#6B6C72` hover `#393A3D`).
  - Title: `"Additional information"` ($30\text{px}$ font-bold text `#1F2937`, leading-tight).
  - Subtitle: `"You're viewing QuickBooks in "` + bold `"Accountant view"` ($14\text{px}$ text `#393A3D`).
  - Company ID Row:
    - `"Your Company ID is 9341 4555 6915 5216"` ($14\text{px}$, ID font-semibold `#1F2937`).
    - Copy Button: $h = 36\text{px}$, border $1\text{px solid #8D9096}$, rounded $4\text{px}$, clipboard icon + `"Copy"`. When clicked, copies to clipboard and updates to `"Copied"` with a $1.4\text{s}$ timeout.
- **Dual Keyboard Shortcut Tables**:
  - Intro: `"Keyboard Shortcuts"` ($15\text{px}$ bold) + instruction `"To use a shortcut, press and hold ctrl/control and alt/option at the same time. Then press one of the keys below."`
  - **Table 1: Main Pages** ($w = 385\text{px}$):
    - Caption: `"On main pages, like the dashboard or customers"` ($13\text{px}$ font-semibold `#393A3D`).
    - Grid: $1\text{px solid #C9CDD2}$, header $h = 28\text{px}$ (`SHORTCUT KEY` $177\text{px}$, `ACTION`).
    - Body: 16 rows, tinted light background `#F4F5F8`, $h = 23\text{px}$ per row:
      - `i` : `Invoice` | `w` : `Check` | `e` : `Estimate` | `x` : `Expense`
      - `r` : `Receive payment` | `j` : `Journal entry` | `c` : `Customers` | `u` : `Run payroll`
      - `v` : `Vendors` | `a` : `Chart of accounts` | `l` : `Lists` | `h` : `Help`
      - `f` : `Global search` | `d` : `Focus the left menu` | `ctrl/cmd + .` : `Toggle ZenMode` | `? or /` : `This dialog`
  - **Table 2: Transactions** ($w = 341\text{px}$):
    - Caption: `"On transactions, like an invoice or expense"` ($13\text{px}$ font-semibold `#393A3D`).
    - Grid: $1\text{px solid #C9CDD2}$, header $h = 28\text{px}$ (`SHORTCUT KEY` $150\text{px}$, `ACTION`).
    - Body: 7 rows, pure white `#FFFFFF` background, $h = 23\text{px}$ per row:
      - `x` : `Exit transaction view` | `c` : `Cancel out` | `s` : `Save and new`
      - `d` : `Save and close` | `m` : `Save and send` | `p` : `Print` | `? or /` : `This dialog`
- **Footer**:
  - Divider: $1\text{px solid #E3E5E8}$ full width.
  - Centered primary button: `"OK"` ($113 \times 40\text{px}$, solid green `#2CA01C` hover `#248817`, text white font-bold $15\text{px}$, rounded $4\text{px}$).

---

## § 69. Products and Services Page Architecture (Screenshots 1 & 2)
- **Topology**:
  - Left icon rail ($84\text{px}$) with standard pinned tiles.
  - Main canvas fills remaining viewport width without an interfering secondary sidebar.
  - Title: `"Products and Services"` ($28\text{px}$ font-bold `#393A3D`).
  - Back link: `< All Lists` ($14\text{px} \text{ #0077C5}$), returns to Chart of accounts.
  - Top Action Cluster:
    - `"More ▼"` Button: $h = 38\text{px}$, border `#8D9096`, white bg, options `Run report`, `Import`, `Export to Excel`.
    - `"New"` Split Button: $h = 38\text{px}$, solid green `#2CA01C`, dropdown trigger with `Inventory`, `Non-inventory`, `Service`, `Bundle`.
- **Collapsible Stat Summary Banner**:
  - Card container: $h = 134\text{px}$, border $1\text{px solid #D4D7DC}$, rounded $8\text{px}$, padding $24\text{px}$, collapse button `^` at right edge.
  - **Low Stock Indicator**:
    - $\varnothing 124\text{px}$ solid orange circle (`#F47B16`) with white isometric package graphic.
    - Bottom-left white badge with downward download arrow in `#F47B16`.
    - Counter: `"0"` ($44\text{px}$ font-bold `#F47B16`), Label: `"LOW STOCK"` ($14\text{px}$ bold `#6B6C72`).
  - **Out of Stock Indicator**:
    - $\varnothing 124\text{px}$ solid red circle (`#D0342C`) with white isometric package graphic.
    - Bottom-left white badge with prohibition circle glyph 🚫 in `#D0342C`.
    - Counter: `"0"` ($44\text{px}$ font-bold `#D0342C`), Label: `"OUT OF STOCK"` ($14\text{px}$ bold `#6B6C72`).
- **Toolbar & Table**:
  - Search: Italic `"Find products and services"` input ($230\text{px}$) + Filter funnel icon with active dot indicator.
  - Tools: Print, Excel export, Settings gear icons + `"Previous  1-18  Next"` pagination.
  - Columns: Checkbox, `NAME ▲` (sorted `#ECEEF1` cell with solid black triangle), `SKU`, `TYPE`, `SALES DESCRIPTIO`, `SALES PRICE`, `COST`, `TAXABLE`, `QTY ON HAND`, `REORDER POINT`, `ACTION`.
  - Category rows: `"Design"` and `"Fountains"` ($h = 31\text{px}$, `#F7F8FA`).
  - Product rows: $h = 83\text{px}$ with $52 \times 52\text{px}$ thumbnail placeholders, green checkmark `✓` (`#217A2B`) for taxable items, right-aligned monetary values, and teal `"Edit ▼"` action menus.

---

## § 70. Recurring Transactions Page Architecture (Screenshot 3)
- **Secondary Sidebar State**:
  - Width: $263\text{px}$, `#F4F5F8`.
  - `Accounting` group expanded: `Recurring transactions` highlighted with active pill (`#E0E3E8`, $h = 38\text{px}$).
  - `Sales & Get Paid` group expanded: displays 8 sub-items (`Overview` through `Products & services`).
  - Pinned items at bottom: `Payroll` + `Marketing` with diamond gem glyphs.
- **Page Header & Toolbar**:
  - Title: `"Recurring Transactions"` ($26\text{px}$ regular font-weight `#393A3D`).
  - Sublink: `< All Lists` ($14\text{px} \text{ #0077C5}$).
  - Top Actions: `"Give feedback"` (green pencil/speech glyph), `"Reminder List ▼"` split button with dark $1.5\text{px}$ border, and green `"New"` button.
  - Filter bar: Italic `"Filter by Name"` input ($198 \times 40\text{px}$), `"Filter"` button, `"All"`, print and gear tools.
- **Scheduled Transactions Table**:
  - Columns: `TEMPLATE NAME ▲` (sorted `#ECEEF1` cell), `TYPE`, `TXN TYPE`, `INTERVAL`, `PREVIOUS DATE`, `NEXT DATE`, `CUSTOMER/VENDOR`, `AMOUNT`, `ACTION`.
  - Sample rows: `Monthly Building Lease` ($900.00), `Telephone Bill` ($74.36) with teal `"Edit ▼"` dropdowns (`Edit`, `Use`, `Duplicate`, `Pause`, `Delete`).
  - Pagination: `"1-2 < [ 1 ] >"`.
- **"Select Transaction Type" Modal**:
  - Dimensions: $428 \times 390\text{px}$, centered, rounded $8\text{px}$, elevation shadow.
  - Header: `"Select Transaction Type"` ($28\text{px}$ bold), subtitle `"Select the type of template to create"`, close `×`.
  - Dropdown: `[ Bill ⌄ ]` ($260 \times 40\text{px}$, with 12 transaction types).
  - Footer: `"Cancel"` ($111 \times 40\text{px}$ white with border) and `"OK"` ($111 \times 40\text{px}$ solid green `#2CA01C`).

---

## § 71. Master Acceptance Checklist (Part 15)
- [x] "Additional information" modal ($837 \times 831\text{px}$) with company ID `9341 4555 6915 5216`, copy button, dual shortcut tables (tinted vs white), and centered green `OK` button.
- [x] Global keyboard shortcut `?` or `/` triggering Additional Info modal.
- [x] Products and Services page with 28px title, `< All Lists`, `More ▼`, and `New` split button.
- [x] Stat summary banner with 124px orange (Low Stock) and red (Out of Stock) circles with package graphics, badges, and collapse toggle.
- [x] Products and Services table with category rows, 52px image boxes, green taxable checks, and `Edit ▼` menus.
- [x] Recurring Transactions page with regular 26px title, `Reminder List ▼` split button, name filter bar, and 2-row table.
- [x] "Select Transaction Type" modal ($428 \times 390\text{px}$) with 12 transaction types.
- [x] Chart of Accounts updated with `Accounts Payable (A/P)` row ($1,602.67) and `Marketing` pinned nav item.
- [x] Gear settings menu wired to navigate to Products and services and Recurring transactions.
- [x] Full production build verified with 0 bundling errors.

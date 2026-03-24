# Capsule MES Frontend Redesign — Design Spec

**Date:** 2026-03-18
**Status:** Reviewed
**Scope:** Full frontend visual redesign of Capsule MES using taste-skill principles

## Summary

Redesign the Capsule MES frontend from a dark theme (gray-900 base) to a Soft Structural light theme inspired by Vercel, Arc Browser, and Linear. Swap font to Geist, icons to Phosphor, and apply subtle motion. Preserve all existing functionality — this is a visual-only change with zero backend modifications.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Visual direction | Soft Structural (floating white cards, generous radius, subtle shadows) |
| Font | Geist (Google Fonts) |
| Icons | Phosphor Icons (`@phosphor-icons/react`, light weight) |
| Motion intensity | Subtle (3-4/10) — fade-in mounts, hover shadows, press feedback |
| Color mode | Light theme only |

## Color System

### Backgrounds
| Token | Class | Hex | Usage |
|-------|-------|-----|-------|
| Page | `bg-gray-100` | #F4F5F7 | Page background |
| Surface | `bg-white` | #FFFFFF | Cards, panels, modals |
| Sidebar | `bg-white` | #FFFFFF | Sidebar with right border |
| Hover | `bg-gray-50` | #F9FAFB | Table row hover, button hover |
| Subtle border | `ring-1 ring-black/[0.02]` | — | Card outline (replaces border-gray-700) |
| Dividers | `divide-gray-100` | #F3F4F6 | Table row separators |

### Text
| Token | Class | Hex | Usage |
|-------|-------|-----|-------|
| Primary | `text-gray-900` | #111827 | Headings, values, labels |
| Secondary | `text-gray-600` | #4B5563 | Body text, descriptions |
| Muted | `text-gray-400` | #9CA3AF | Timestamps, hints, sublabels |
| Disabled | `text-gray-300` | #D1D5DB | Disabled states |

### Interactive
| Token | Class | Hex | Usage |
|-------|-------|-----|-------|
| Primary action | `bg-gray-900 text-white` | #111827 | Primary buttons, active nav |
| Primary hover | `bg-gray-800` | #1F2937 | Primary button hover |
| Link | `text-blue-600` | #2563EB | Text links only |
| Link hover | `text-blue-700` | #1D4ED8 | Link hover |
| Focus ring | `ring-2 ring-gray-900` | — | Input focus, button focus |

### Semantic (Status Badges)
Soft-tinted pill badges replace dot+text pattern:

| Status | Background | Text | Usage |
|--------|-----------|------|-------|
| Completed / Success | `bg-emerald-50` | `text-emerald-700` | Completed stages, received items |
| In Progress / Warning | `bg-amber-50` | `text-amber-700` | Active work, pending items |
| Blocked / Error | `bg-red-50` | `text-red-700` | Blocked stages, overdue, errors |
| Not Started / Neutral | `bg-gray-100` | `text-gray-500` | Not started, inactive |

### Priority Badges
| Priority | Background | Text |
|----------|-----------|------|
| Critical | `bg-red-50` | `text-red-700` |
| High | `bg-amber-50` | `text-amber-700` |
| Medium | `bg-gray-100` | `text-gray-500` |
| Low | `bg-gray-100` | `text-gray-400` |

## Typography

**Font family:** `'Geist', system-ui, -apple-system, sans-serif`

Load via Google Fonts in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Scale
| Element | Classes | Notes |
|---------|---------|-------|
| Page title | `text-2xl font-bold tracking-tight text-gray-900` | `-0.03em` tracking |
| Section header | `text-[11px] uppercase tracking-wider font-medium text-gray-400` | Small caps labels |
| Card title | `text-sm font-semibold text-gray-900` | |
| Body text | `text-sm text-gray-600` | |
| Table header | `text-[11px] uppercase tracking-wider font-medium text-gray-400` | |
| Table cell | `text-sm text-gray-600` | |
| Metric value | `text-3xl font-bold tracking-tighter text-gray-900` | `-0.04em` tracking. **Note:** This supersedes the previous dark-theme `text-2xl` cap from `DESIGN_SYSTEM.md` and `CLAUDE.md`. The old rule applied to the dark theme's restrained aesthetic; the new Soft Structural design uses larger metrics per taste-skill guidance. |
| Metric label | `text-[11px] uppercase tracking-wider font-medium text-gray-400` | |
| Badge text | `text-[11px] font-medium` | Inside pill badges |

## Component Patterns

### Card
```
bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5
```
- 16px border-radius (`rounded-2xl`)
- Subtle composite shadow: `shadow-sm` + hairline `ring-1 ring-black/[0.02]`
- No colored borders, no `shadow-lg`

### Buttons
```
Primary:   bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all
Secondary: bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all
Danger:    bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all
Ghost:     text-gray-500 hover:text-gray-900 text-sm transition-colors
```

### Inputs
```
bg-white ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 px-3 py-2
focus:ring-2 focus:ring-gray-900 focus:ring-offset-0
placeholder:text-gray-400
```

### Select
Wrap native `<select>` in a relative container with `appearance-none` to hide browser chrome:
```
Wrapper:  relative
Select:   appearance-none bg-white ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 px-3 py-2 pr-8
          focus:ring-2 focus:ring-gray-900 w-full
Icon:     absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400
          <CaretDown size={14} />
```

### Tables
Rendered inside a white card container:
```
Card:    bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden
Header:  text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3 border-b border-gray-100
Row:     text-sm text-gray-600 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors
```

### Sidebar
```
Container: bg-white border-r border-gray-100 w-[220px] p-3
Nav item:  text-sm text-gray-500 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors
Active:    bg-gray-900 text-white rounded-lg px-3 py-2 font-medium
```

### Modals
```
Backdrop:  bg-black/40 backdrop-blur-sm
Modal:     bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full
```

### Badges (Status/Priority)
The current `Badge.tsx` renders a dot + text. Replace with a soft-tinted pill. The component keeps its existing `variant` prop but the rendering changes:

```tsx
// New Badge rendering (no dot element)
<span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${colorClasses}`}>
  {children}
</span>
```

**Variant → color mapping:**

| Variant / Value | Background | Text |
|----------------|-----------|------|
| status: Completed | `bg-emerald-50` | `text-emerald-700` |
| status: In Progress | `bg-amber-50` | `text-amber-700` |
| status: Blocked | `bg-red-50` | `text-red-700` |
| status: Not Started | `bg-gray-100` | `text-gray-500` |
| priority: Critical | `bg-red-50` | `text-red-700` |
| priority: High | `bg-amber-50` | `text-amber-700` |
| priority: Medium | `bg-gray-100` | `text-gray-500` |
| priority: Low | `bg-gray-100` | `text-gray-400` |
| stage: Engineering | `bg-blue-50` | `text-blue-700` |
| stage: WO Release | `bg-violet-50` | `text-violet-700` |
| stage: Materials | `bg-amber-50` | `text-amber-700` |
| stage: Production | `bg-emerald-50` | `text-emerald-700` |
| default | `bg-gray-100` | `text-gray-600` |

### Tabs
```
Container: border-b border-gray-200
Tab:       text-sm text-gray-500 pb-3 px-1 hover:text-gray-900 transition-colors
Active:    text-gray-900 font-medium border-b-2 border-gray-900
```

### Toast Notifications
```
Container: bg-white rounded-xl shadow-lg ring-1 ring-black/[0.05] p-4
```
With colored left bar: `border-l-4 border-emerald-500` (success), `border-red-500` (error), etc.

**Note:** The current `ToastContainer.tsx` uses `animate-in slide-in-from-right` classes from `tailwindcss-animate`, which is NOT installed. These are silently no-ops. Replace with the custom `animate-slideInRight` keyframe defined in this spec's Tailwind config. Do NOT install `tailwindcss-animate`.

### Workflow Progress Bar
Horizontal stepper with connected dots:
- Completed: `bg-emerald-500` dot, `text-gray-900 font-medium` label
- In Progress: `bg-amber-500` dot, `text-gray-900` label
- Not Started: `bg-gray-200` dot, `text-gray-400` label
- Connector: `h-0.5 bg-gray-200` between dots (filled `bg-emerald-500` for completed segments)

## Icons

**Library:** `@phosphor-icons/react`

**Default weight:** `light` (thinner strokes for soft aesthetic)

**Sizes:**
- Navigation: `size={18}`
- Inline/buttons: `size={16}`
- Table actions: `size={16}`
- Metric cards: `size={20}`

**Migration approach:** Search-and-replace Lucide imports with Phosphor equivalents. Common mappings:

| Lucide | Phosphor |
|--------|----------|
| `Plus` | `Plus` |
| `Search` | `MagnifyingGlass` |
| `Edit`, `Pencil` | `PencilSimple` |
| `Trash2` | `Trash` |
| `X` | `X` |
| `ChevronDown` | `CaretDown` |
| `ChevronRight` | `CaretRight` |
| `Check` | `Check` |
| `AlertTriangle` | `Warning` |
| `FileText` | `FileText` |
| `Upload` | `UploadSimple` |
| `Download` | `DownloadSimple` |
| `MoreHorizontal` | `DotsThree` |
| `MoreVertical` | `DotsThreeVertical` |
| `Settings`, `Cog` | `GearSix` |
| `Users` | `Users` |
| `Package` | `Package` |
| `Clipboard` | `ClipboardText` |
| `BarChart` | `ChartBar` |
| `Clock` | `Clock` |
| `Calendar` | `Calendar` |
| `Link` | `Link` |
| `ExternalLink` | `ArrowSquareOut` |
| `Eye` | `Eye` |
| `Filter` | `Funnel` |
| `Home` | `House` |
| `Layers` | `Stack` |
| `Box` | `Cube` |
| `Wrench` | `Wrench` |
| `Activity` | `Activity` |
| `ArrowLeft` | `ArrowLeft` |
| `ArrowRight` | `ArrowRight` |
| `ArrowUp` | `ArrowUp` |
| `ArrowDown` | `ArrowDown` |
| `RefreshCw` | `ArrowClockwise` |
| `GripVertical` | `DotsSixVertical` |
| `LayoutDashboard` | `SquaresFour` |
| `Building2` | `Buildings` |
| `Factory` | `Factory` |
| `Truck` | `Truck` |
| `QrCode` | `QrCode` |
| `Scan` | `Scan` |
| `CircleDot` | `CircleDashed` |
| `CheckCircle` | `CheckCircle` |
| `AlertCircle` | `WarningCircle` |
| `XCircle` | `XCircle` |
| `Info` | `Info` |
| `Briefcase` | `Briefcase` |
| `FileSpreadsheet` | `FileXls` |
| `ScanLine` | `Scan` |
| `Edit2` | `PencilSimple` |
| `CheckCircle2` | `CheckCircle` |
| `DollarSign` | `CurrencyDollar` |
| `Timer` | `Timer` |
| `Cpu` | `Cpu` |
| `FileCheck` | `FileCheck` |
| `ClipboardList` | `ClipboardText` |
| `Send` | `PaperPlaneTilt` |
| `User` | `User` |
| `LayoutGrid` | `GridFour` |
| `List` | `List` |
| `Warehouse` | `Warehouse` |
| `PackageCheck` | `Package` (no direct equivalent — use `Package` with context) |
| `ShoppingCart` | `ShoppingCart` |
| `Link2` | `Link` |
| `GitBranch` | `GitBranch` |
| `LogIn` | `SignIn` |
| `LogOut` | `SignOut` |
| `Delete` | `Backspace` |
| `PauseCircle` | `PauseCircle` |
| `Ban` | `Prohibit` |
| `MapPin` | `MapPin` |
| `ArrowDownToLine` | `ArrowLineDown` |
| `ArrowUpFromLine` | `ArrowLineUp` |
| `Monitor` | `Monitor` |
| `TruckIcon` | `Truck` |
| `ChevronUp` | `CaretUp` |
| `ChevronLeft` | `CaretLeft` |
| `Circle` | `Circle` |
| `Minus` | `Minus` |
| `Save` | `FloppyDisk` |
| `Copy` | `Copy` |
| `Hash` | `Hash` |
| `Tag` | `Tag` |
| `Mail` | `Envelope` |
| `Phone` | `Phone` |
| `Globe` | `Globe` |

## Motion

### Principles
- Animate only `transform` and `opacity` (never layout properties)
- Keep durations 150-300ms
- Use `ease-out` for entrances, `ease-in` for exits
- No staggered list animations, no spring physics, no perpetual loops

### Animations
| Element | Effect | Implementation |
|---------|--------|---------------|
| Page mount | Fade in + slide up 8px | CSS: `animate-fadeIn` (opacity 0→1, translateY 8→0, 300ms ease-out) |
| Card hover | Shadow deepens | `transition-shadow duration-200 hover:shadow-md` |
| Button press | Scale down | `active:scale-[0.98] transition-transform` |
| Modal enter | Fade + scale from 95% | `animate-modalIn` (opacity 0→1, scale 0.95→1, 200ms ease-out) |
| Modal backdrop | Fade in | `animate-fadeIn` (200ms) |
| Toast enter | Slide in from right | `animate-slideInRight` (translateX 100%→0, 300ms ease-out) |
| Hover states | Color transition | `transition-colors duration-150` |

### Tailwind Config Additions
```js
keyframes: {
  fadeIn: {
    '0%': { opacity: '0', transform: 'translateY(8px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  modalIn: {
    '0%': { opacity: '0', transform: 'scale(0.95)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
  slideInRight: {
    '0%': { transform: 'translateX(100%)' },
    '100%': { transform: 'translateX(0)' },
  },
},
animation: {
  fadeIn: 'fadeIn 300ms ease-out',
  modalIn: 'modalIn 200ms ease-out',
  slideInRight: 'slideInRight 300ms ease-out',
}
```

## Files Affected

### Configuration (3 files)
- `client/index.html` — Add Geist font link
- `client/tailwind.config.js` — Font family, keyframes, animation utilities
- `client/src/index.css` — Update base styles, remove dark theme globals
- `client/package.json` — Add `@phosphor-icons/react`, remove `lucide-react`

### UI Primitives (9 files)
All files in `client/src/components/ui/`:
- `Button.tsx` — New color/radius/motion classes
- `Card.tsx` — White bg, rounded-2xl, shadow-sm, ring
- `Input.tsx` — White bg, ring-1, rounded-[10px]
- `Select.tsx` — Match input style
- `Modal.tsx` — White bg, rounded-2xl, backdrop-blur, animation
- `Tabs.tsx` — Bottom border style, dark active indicator
- `Badge.tsx` — Soft-tinted pills instead of dot+text
- `ToastContainer.tsx` — White bg, shadow-lg, colored left border
- `LoadingSpinner.tsx` — Update to gray-900 spinner. **Fix pre-existing bug:** `border-3` is not a standard Tailwind class (only `border-2` and `border-4` exist). Change to `border-2`.

### Layout (1 file)
- `client/src/components/layout/AppLayout.tsx` — Full redesign:
  - **Page wrapper:** `bg-gray-100 min-h-screen`
  - **Sidebar:** `bg-white border-r border-gray-100 w-[220px]` with dark active nav
  - **Header bar:** `bg-white border-b border-gray-100` (replaces dark `bg-gray-800 border-gray-700`)
  - **"New Job" button in header:** `bg-gray-900 text-white rounded-[10px]`
  - **Avatar circle:** `bg-gray-200 text-gray-600` (replaces `bg-gray-700`)

### Pages (12+ files)
All files in `client/src/pages/` — Update background colors, typography, card usage, icon imports

**Kiosk pages** (`client/src/pages/kiosk/` — 3 files): These are operator-facing, touch-optimized screens used on the shop floor. Apply the same light theme but with adaptations:
- Larger tap targets: buttons `py-3 px-6 text-base` minimum
- Larger text: `text-lg` body, `text-2xl` headings (readability at arm's length)
- `StationLogin.tsx` PIN pad: large grid buttons `w-16 h-16 text-2xl rounded-2xl`
- Keep the full-screen layout (no sidebar) — only update colors and typography

### Feature Components (~43 files)
All files in `client/src/components/` subdirectories — Update colors, borders, typography, icon imports

### Contexts (2 files)
- `ToastContext.tsx` — Toast styling updates
- `KioskContext.tsx` — Minimal changes (logic only)

**Total: ~70 files**

## Approach

### Phase 1: Foundation
1. Install Phosphor Icons, add Geist font
2. Update `tailwind.config.js` with font, keyframes, animations
3. Update `index.css` base styles

### Phase 2: UI Primitives
4. Redesign all 9 `components/ui/` files — these cascade everywhere

### Phase 3: Layout
5. Redesign `AppLayout.tsx` sidebar and page wrapper

### Phase 4: Pages & Components
6. Update all pages and feature components — mostly color/typography/icon swaps since the primitives handle the heavy lifting

### Phase 5: Cleanup
7. Remove `lucide-react` from package.json
8. Update `DESIGN_SYSTEM.md` to reflect new system
9. Verify build passes with zero TypeScript errors

## Constraints
- Zero backend changes
- No changes to routing, data flow, hooks, or services
- All existing functionality preserved
- Must pass `npm run build` with no TypeScript errors
- Phosphor icon must exist for every Lucide icon currently used

## Success Criteria
- Light theme applied consistently across all pages
- Geist font rendering on all text
- All Lucide icons replaced with Phosphor equivalents
- Subtle motion on page load, button press, modal open
- Status badges use soft-tinted pills
- Cards use rounded-2xl + shadow-sm pattern
- `npm run build` passes clean

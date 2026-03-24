# Capsule MES — Design System

**Theme:** Soft Structural Light
**Last updated:** 2026-03-18
**Status:** Active

---

## Philosophy

Clean, restrained, data-first. White surfaces with generous border-radius. Color used sparingly and with semantic meaning only. Typography hierarchy over color. Inspired by Vercel, Linear, and Arc Browser.

---

## Color System

### Backgrounds
| Token | Class | Usage |
|-------|-------|-------|
| Page | `bg-gray-100` | Page background (handled by AppLayout) |
| Surface | `bg-white` | Cards, panels, modals, sidebar |
| Hover | `bg-gray-50` | Table row hover, button hover, expanded rows |
| Subtle border | `ring-1 ring-black/[0.02]` | Card outline |
| Dividers | `border-gray-100` | Table headers, card borders, sidebar borders |
| Table row separator | `border-gray-50` | Between table rows |

### Text
| Token | Class | Usage |
|-------|-------|-------|
| Primary | `text-gray-900` | Headings, values, labels |
| Secondary | `text-gray-600` | Body text, table cells, descriptions |
| Muted | `text-gray-400` | Timestamps, hints, section labels, placeholders |
| Disabled | `text-gray-300` | Disabled states only |

### Interactive
| Token | Class | Usage |
|-------|-------|-------|
| Primary action | `bg-gray-900 text-white` | Primary buttons, active nav |
| Primary hover | `bg-gray-800` | Primary button hover |
| Link | `text-blue-600` | Text links only |
| Link hover | `text-blue-700` | |
| Focus ring | `ring-2 ring-gray-900` | Input focus, button focus |

### Semantic (Status Badges — soft-tinted pills)
| Status | Background | Text |
|--------|-----------|------|
| Completed / Success | `bg-emerald-50` | `text-emerald-700` |
| In Progress / Warning | `bg-amber-50` | `text-amber-700` |
| Blocked / Error | `bg-red-50` | `text-red-700` |
| Not Started / Neutral | `bg-gray-100` | `text-gray-500` |

### Priority Badges
| Priority | Background | Text |
|----------|-----------|------|
| Critical | `bg-red-50` | `text-red-700` |
| High | `bg-amber-50` | `text-amber-700` |
| Medium | `bg-gray-100` | `text-gray-500` |
| Low | `bg-gray-100` | `text-gray-400` |

### Stage Badges
| Stage | Background | Text |
|-------|-----------|------|
| Engineering | `bg-blue-50` | `text-blue-700` |
| WO Release | `bg-violet-50` | `text-violet-700` |
| Materials | `bg-amber-50` | `text-amber-700` |
| Production | `bg-emerald-50` | `text-emerald-700` |

---

## Typography

**Font family:** `'Geist', system-ui, -apple-system, sans-serif`

| Element | Classes |
|---------|---------|
| Page title | `text-2xl font-bold tracking-tight text-gray-900` |
| Section header / table header | `text-[11px] uppercase tracking-wider font-medium text-gray-400` |
| Card title | `text-sm font-semibold text-gray-900` |
| Body text | `text-sm text-gray-600` |
| Table cell | `text-sm text-gray-600` |
| Metric value | `text-3xl font-bold tracking-tighter text-gray-900` |
| Metric label | `text-[11px] uppercase tracking-wider font-medium text-gray-400` |
| Badge text | `text-[11px] font-medium` |

---

## Component Patterns

### Card
```
bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5
```
Interactive card: add `hover:shadow-md transition-shadow duration-200`

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
focus:ring-2 focus:ring-gray-900 focus:outline-none placeholder:text-gray-400
```

### Select
```
Wrapper:  relative
Select:   appearance-none bg-white ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 px-3 py-2 pr-8 focus:ring-2 focus:ring-gray-900 w-full
Icon:     absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 <CaretDown size={14} />
```

### Tables (inside white card container)
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
Backdrop:  bg-black/40 backdrop-blur-sm animate-fadeIn
Modal:     bg-white rounded-2xl shadow-xl animate-modalIn
Header:    border-b border-gray-100
```

### Badges (Status/Priority/Stage)
Soft-tinted pill (no dot):
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700">
  Completed
</span>
```
Use the `<Badge>` component — it handles all variants automatically.

### Tabs
```
Container: border-b border-gray-200
Tab:       text-sm text-gray-500 pb-3 px-1 hover:text-gray-900 transition-colors border-b-2 border-transparent
Active:    text-gray-900 font-medium border-b-2 border-gray-900
```

### Toast Notifications
```
bg-white rounded-xl shadow-lg ring-1 ring-black/[0.05] p-4 border-l-4 [border-color]
animate-slideInRight
```

---

## Icons

**Library:** `@phosphor-icons/react`
**Default weight:** `light`

**Sizes:**
- Navigation: `size={18}`
- Inline/buttons: `size={16}`
- Metric cards: `size={20}`
- Empty state illustrations: `size={48}`

---

## Animations

| Element | Class | Definition |
|---------|-------|-----------|
| Page mount | `animate-fadeIn` | opacity 0→1, translateY 8→0, 300ms ease-out |
| Modal open | `animate-modalIn` | opacity 0→1, scale 0.95→1, 200ms ease-out |
| Toast enter | `animate-slideInRight` | translateX 100%→0, 300ms ease-out |
| Card hover | `transition-shadow duration-200 hover:shadow-md` | CSS transition |
| Button press | `active:scale-[0.98] transition-all` | CSS transform |

---

## Critical Design Rules

1. **No colored icon backgrounds** — icons are `text-gray-400` or semantic color only
2. **No rainbow metric cards** — metric values are `text-gray-900`, never colored
3. **Semantic color only on the meaning-bearing element** — never on surrounding containers
4. **One primary action color** (`bg-gray-900`) for interactive elements
5. **Metric values use `text-3xl`** — not smaller
6. **Use `shadow-sm` for cards, `shadow-xl` for modals** — no `shadow-lg` on cards
7. **Soft-tinted pill badges** — no dot+text pattern, no colored backgrounds on container
8. **No gradient backgrounds**
9. **No colored borders on cards** — use `ring-1 ring-black/[0.02]`
10. **Tables always inside a white card container** with `overflow-hidden`

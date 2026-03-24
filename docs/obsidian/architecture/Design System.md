# Design System

> **Philosophy:** Clean. Restrained. Data-first. Built by engineers for engineers.

Full spec: `DESIGN_SYSTEM.md` at project root.

## Color Palette

### Backgrounds (Tailwind gray scale)
| Usage | Class | Hex |
|-------|-------|-----|
| Page background | `bg-gray-900` | #111827 |
| Cards, panels, sidebar | `bg-gray-800` | #1F2937 |
| Hover states | `bg-gray-700` | #374151 |
| Default borders | `border-gray-700` | #374151 |
| Subtle borders | `border-gray-800` | #1F2937 |

### Text
| Usage | Class |
|-------|-------|
| Headings, values | `text-gray-100` |
| Labels, descriptions | `text-gray-400` |
| Timestamps, hints | `text-gray-500` |
| Disabled | `text-gray-600` |

### Accent (interactive elements ONLY)
- Primary: `blue-500` (#3B82F6)
- Hover: `blue-600` (#2563EB)

### Semantic (status meaning ONLY)
| Meaning | Color |
|---------|-------|
| Success / Completed | `emerald-500` (#10B981) |
| Warning / In Progress | `amber-500` (#F59E0B) |
| Danger / Blocked | `red-500` (#EF4444) |
| Neutral / Not Started | `gray-500` (#6B7280) |

## Component Patterns

| Component | Classes |
|-----------|---------|
| Card | `bg-gray-800 border border-gray-700 rounded-lg p-4` |
| Primary button | `bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-md` |
| Secondary button | `bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-sm font-medium px-3 py-1.5 rounded-md` |
| Danger button | `bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium px-3 py-1.5 rounded-md` |
| Input | `bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500` |
| Active sidebar nav | `text-white bg-blue-500/10 border-l-2 border-blue-500` |
| Status badge | Small colored dot + `text-gray-300` label (no colored background) |
| Table row | `text-sm text-gray-300 border-b border-gray-800 hover:bg-gray-800/50` |

## Critical Rules (enforce on every PR)

1. **No colored icon backgrounds** — icons are `text-gray-400` or `text-gray-500` only
2. **No rainbow metric cards** — values are `text-gray-100`, never colored
3. **Semantic color only on the meaning-bearing element** — never on surrounding containers
4. **One accent color** (blue-500) for interactive elements only
5. **No `text-4xl` for metrics** — `text-2xl` max
6. **No `shadow-lg`/`shadow-xl`** — borders define card boundaries
7. **No colored pill badges** — small colored dot + gray text
8. **No gradient backgrounds**
9. **No colored borders on cards**

## Typography
| Element | Classes |
|---------|---------|
| Page title | `text-lg font-semibold text-gray-100` |
| Section header | `text-sm font-medium text-gray-400 uppercase tracking-wider` |
| Card title | `text-sm font-medium text-gray-100` |
| Body text | `text-sm text-gray-300` |
| Labels | `text-xs text-gray-500` |
| Data values | `text-sm font-medium text-gray-100` |

## Icons
- Library: Lucide React
- Default size: `w-4 h-4`
- Color: `text-gray-400` or `text-gray-500`
- Never use colored backgrounds behind icons

---
See also: [[Components]] · [[Tech Stack]]

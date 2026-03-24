# Frontend Redesign — Soft Structural Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark gray-900 theme with a Soft Structural light theme (white cards, rounded-2xl, shadow-sm) and migrate all icons from Lucide to Phosphor.

**Architecture:** Pure visual-only swap — no routing, logic, hooks, or API changes. Foundation files (tailwind config + index.css + UI primitives) cascade their changes to pages and feature components, minimizing per-file changes. Icon imports are a mechanical find-and-replace across ~70 files using the spec's icon mapping table.

**Tech Stack:** React 18, TypeScript, TailwindCSS, `@phosphor-icons/react`, Geist (Google Fonts), Headless UI

> **Note on TDD:** This plan has zero logic changes — all changes are visual classes and icon imports. There are no behaviors to unit-test. Verification at each checkpoint is `npm run build` passing with zero TypeScript errors.

---

## Key Design Decisions

The current codebase uses CSS utility classes defined in `index.css` (`@layer components`): `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.card`, `.badge`, `.badge-dot`. Updating these in `index.css` cascades to all components that use them — which means `Button.tsx` gets most of its update "for free" from Task 2.

**Color migration reference (dark → light):**
| Dark class | Light replacement |
|------------|------------------|
| `bg-gray-900` (page) | `bg-gray-100` |
| `bg-gray-800` (card/sidebar) | `bg-white` |
| `bg-gray-700` (hover) | `bg-gray-50` |
| `border-gray-700` | `border-gray-100` or `ring-1 ring-gray-200` |
| `border-gray-800` | `border-gray-100` |
| `text-gray-100` | `text-gray-900` |
| `text-gray-300` | `text-gray-600` |
| `text-gray-400` | `text-gray-500` or `text-gray-400` |
| `text-gray-500` | `text-gray-400` |
| `bg-blue-500 hover:bg-blue-600` (primary btn) | `bg-gray-900 hover:bg-gray-800` |
| `border-blue-500` (focus) | `ring-2 ring-gray-900` |

**Icon import reference (Lucide → Phosphor) — see spec for full mapping table.**

---

## File Map

### Created
*(none)*

### Modified

**Configuration:**
- `client/index.html` — Add Geist font link
- `client/tailwind.config.js` — Font family, keyframes, animations
- `client/src/index.css` — Rewrite base styles + utility classes
- `client/package.json` — Add `@phosphor-icons/react`, remove `lucide-react` (Task 14)

**UI Primitives (9 files):**
- `client/src/components/ui/Badge.tsx` — DOM structure: dot+text → soft-tinted pill
- `client/src/components/ui/Button.tsx` — Add `ghost` variant; sizes updated
- `client/src/components/ui/Card.tsx` — white/rounded-2xl/shadow-sm
- `client/src/components/ui/Input.tsx` — white bg, ring-1 ring-gray-200, rounded-[10px]
- `client/src/components/ui/Select.tsx` — wrapper + CaretDown icon (Phosphor)
- `client/src/components/ui/Modal.tsx` — white bg, rounded-2xl, backdrop-blur, animate-modalIn
- `client/src/components/ui/Tabs.tsx` — border-b-gray-200, dark active indicator
- `client/src/components/ui/ToastContainer.tsx` — white bg, colored left border, animate-slideInRight
- `client/src/components/ui/LoadingSpinner.tsx` — gray-900 spinner, fix `border-3` → `border-2`

**Layout (1 file):**
- `client/src/components/layout/AppLayout.tsx` — full light theme sidebar/header

**Pages (14 files):**
- `client/src/pages/Dashboard.tsx`
- `client/src/pages/Jobs.tsx`
- `client/src/pages/JobDetail.tsx`
- `client/src/pages/Engineering.tsx`
- `client/src/pages/SupplyChain.tsx`
- `client/src/pages/Production.tsx`
- `client/src/pages/Clients.tsx`
- `client/src/pages/PartsTracking.tsx`
- `client/src/pages/RouteTemplates.tsx`
- `client/src/pages/PartDetail.tsx`
- `client/src/pages/StationKiosks.tsx`
- `client/src/pages/kiosk/StationLogin.tsx`
- `client/src/pages/kiosk/MachineSelect.tsx`
- `client/src/pages/kiosk/StationDashboard.tsx`

**Feature components (45 files):**
- `client/src/components/jobs/` — JobCard, EngineeringJobCard, ProductionJobCard, SupplyChainJobCard, QuickAddJobModal, EditJobModal, tabs/MaterialsTab, tabs/OverviewTab, tabs/ProductionTab, tabs/SupplyChainTab
- `client/src/components/engineering/` — AddBomItemModal, EditBomItemModal, AddPbomItemModal, EditPbomItemModal, GeneratePartsModal, BomItemsTable, BomImport, PbomImport, PbomTableEngineering, DesignMilestones, InitializePartsModal, SendToProductionModal, WorkOrderFiles, ManageEngineersModal, RecutsTab
- `client/src/components/supplychain/` — AddInventoryModal, EditInventoryModal, EditOrderModal, ReceiveOrderModal, PbomTableSupplyChain, GlobalInventoryPanel, SortableJobCard, MassOrderModal, OrderTrackingPanel, EditPbomItemModalSupplyChain
- `client/src/components/parts-tracking/` — BulkCreatePartsModal, RouteTemplateModal, ScrapPartModal, JobPartsPanel, StationCheckInOut, RouteStepEditor
- `client/src/components/clients/` — AddClientModal, EditClientModal
- `client/src/components/production/` — ProductionProjects
- `client/src/components/kiosk/` — KioskPartModal
- `client/src/contexts/ToastContext.tsx`, `KioskContext.tsx`

**Docs:**
- `DESIGN_SYSTEM.md` — update to reflect new light system

---

## Task 1: Install Phosphor Icons + Add Geist Font

**Files:**
- Modify: `client/package.json`
- Modify: `client/index.html`

- [ ] **Step 1: Install Phosphor Icons**

```bash
cd client && npm install @phosphor-icons/react
```

Expected output: `added N packages`

- [ ] **Step 2: Add Geist font to index.html**

In `client/index.html`, add inside `<head>` before any other stylesheet:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Verify build**

```bash
cd client && npm run build
```

Expected: Build succeeds (Phosphor tree-shakes cleanly).

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/package-lock.json client/index.html
git commit -m "feat: install @phosphor-icons/react, add Geist font"
```

---

## Task 2: Tailwind Config + CSS Foundation

**Files:**
- Modify: `client/tailwind.config.js`
- Modify: `client/src/index.css`

- [ ] **Step 1: Rewrite tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
      },
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
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Rewrite index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-100 text-gray-900 antialiased;
    font-family: 'Geist', system-ui, -apple-system, sans-serif;
  }

  input,
  textarea,
  select {
    @apply bg-white text-gray-900 ring-1 ring-gray-200 rounded-[10px] px-3 py-2 text-sm;
  }

  input:focus,
  textarea:focus,
  select:focus {
    @apply outline-none ring-2 ring-gray-900;
  }

  input::placeholder,
  textarea::placeholder {
    @apply text-gray-400;
  }
}

@layer components {
  .card {
    @apply bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02];
  }

  .card-hover {
    @apply hover:shadow-md transition-shadow duration-200 cursor-pointer;
  }

  .btn-primary {
    @apply bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all;
  }

  .btn-secondary {
    @apply bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all;
  }

  .btn-danger {
    @apply bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all;
  }

  .btn-ghost {
    @apply text-gray-500 hover:text-gray-900 text-sm transition-colors;
  }

  /* Legacy badge classes — kept for any components that reference them directly */
  .badge {
    @apply inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium;
  }
}
```

- [ ] **Step 3: Verify `.badge-dot` is not used directly outside Badge.tsx**

Before removing `.badge-dot` from `index.css`, confirm no other file references it:

```bash
grep -r "badge-dot" client/src/ --include="*.tsx" --include="*.ts" -l
```

Expected: Only `Badge.tsx` (or no output if it doesn't reference it directly). If any other file appears, update those call sites to use the `<Badge>` component instead before proceeding.

- [ ] **Step 4: Verify build**

```bash
cd client && npm run build
```

Expected: Build succeeds. This will immediately update every component that uses `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.card` classes — no per-component edits needed for those.

- [ ] **Step 5: Commit**

```bash
git add client/tailwind.config.js client/src/index.css
git commit -m "feat: add Soft Structural theme foundation — tailwind keyframes, light base styles, updated utility classes"
```

---

## Task 3: UI Primitives Batch 1 — Badge, Card, Input, Select

**Files:**
- Modify: `client/src/components/ui/Badge.tsx`
- Modify: `client/src/components/ui/Card.tsx`
- Modify: `client/src/components/ui/Input.tsx`
- Modify: `client/src/components/ui/Select.tsx`

- [ ] **Step 1: Rewrite Badge.tsx — dot+text → soft-tinted pill**

```tsx
import type { JobPriority, WorkflowStageStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'priority' | 'status' | 'stage' | 'default';
  priority?: JobPriority;
  status?: WorkflowStageStatus;
  stage?: string;
  className?: string;
}

function getColorClasses(
  variant: string,
  priority?: JobPriority,
  status?: WorkflowStageStatus,
  stage?: string
): string {
  if (variant === 'priority' && priority) {
    switch (priority) {
      case 'Critical': return 'bg-red-50 text-red-700';
      case 'High':     return 'bg-amber-50 text-amber-700';
      case 'Medium':   return 'bg-gray-100 text-gray-500';
      case 'Low':      return 'bg-gray-100 text-gray-400';
    }
  }
  if (variant === 'status' && status) {
    switch (status) {
      case 'Completed':   return 'bg-emerald-50 text-emerald-700';
      case 'In Progress': return 'bg-amber-50 text-amber-700';
      case 'Blocked':     return 'bg-red-50 text-red-700';
      case 'Not Started': return 'bg-gray-100 text-gray-500';
    }
  }
  if (variant === 'stage' && stage) {
    switch (stage) {
      case 'Engineering': return 'bg-blue-50 text-blue-700';
      case 'WO Release':  return 'bg-violet-50 text-violet-700';
      case 'Materials':   return 'bg-amber-50 text-amber-700';
      case 'Production':  return 'bg-emerald-50 text-emerald-700';
    }
  }
  return 'bg-gray-100 text-gray-600';
}

export default function Badge({
  children,
  variant = 'default',
  priority,
  status,
  stage,
  className = '',
}: BadgeProps) {
  const colorClasses = getColorClasses(variant, priority, status, stage);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${colorClasses} ${className}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Read current Card.tsx, then update it**

Read `client/src/components/ui/Card.tsx` first, then apply:
- Replace `bg-gray-800 border border-gray-700 rounded-lg` → `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02]`
- Remove any `shadow-lg`, `shadow-xl`
- Keep `p-4` or `p-5` padding as-is

- [ ] **Step 3: Read current Input.tsx, then update it**

Read `client/src/components/ui/Input.tsx` first, then apply:
- Replace dark classes with: `bg-white ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 px-3 py-2 focus:ring-2 focus:ring-gray-900 focus:outline-none placeholder:text-gray-400`
- Note: `index.css` base layer already sets these for native `input` elements, but the React component likely wraps with additional classes — keep the component's className logic intact, just update the class strings

- [ ] **Step 4: Read current Select.tsx, then update it**

Read `client/src/components/ui/Select.tsx` first, then apply:
- Add `@phosphor-icons/react` import: `import { CaretDown } from '@phosphor-icons/react';`
- Wrap native `<select>` in `<div className="relative">` if not already
- Select classes: `appearance-none bg-white ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 px-3 py-2 pr-8 focus:ring-2 focus:ring-gray-900 focus:outline-none w-full`
- Add caret icon after select: `<CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />`

- [ ] **Step 5: Verify build**

```bash
cd client && npm run build
```

Expected: Build succeeds, zero TypeScript errors.

- [ ] **Step 6: Migrate Badge call sites from `status` to `stage` prop**

The new `Badge` component uses a `stage` prop for stage variant (not `status`). Find all call sites that use `variant="stage"` and update them:

```bash
grep -rn 'variant="stage"' client/src/ --include="*.tsx"
```

For each match, change `status={stageName}` → `stage={stageName}`. Example:
```tsx
// Before
<Badge variant="stage" status="Engineering">Engineering</Badge>
// After
<Badge variant="stage" stage="Engineering">Engineering</Badge>
```

- [ ] **Step 7: Verify build**

```bash
cd client && npm run build
```

Expected: Zero TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/ui/Badge.tsx client/src/components/ui/Card.tsx client/src/components/ui/Input.tsx client/src/components/ui/Select.tsx
git commit -m "feat: redesign Badge (soft-tinted pill), Card, Input, Select to light theme; migrate stage badge call sites"
```

---

## Task 4: UI Primitives Batch 2 — Modal, Tabs, ToastContainer, LoadingSpinner, Button

**Files:**
- Modify: `client/src/components/ui/Modal.tsx`
- Modify: `client/src/components/ui/Tabs.tsx`
- Modify: `client/src/components/ui/ToastContainer.tsx`
- Modify: `client/src/components/ui/LoadingSpinner.tsx`
- Modify: `client/src/components/ui/Button.tsx`

- [ ] **Step 1: Rewrite Modal.tsx**

```tsx
import { Dialog } from '@headlessui/react';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl';
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <Dialog.Panel
          className={`${maxWidthClasses[maxWidth]} w-full bg-white rounded-2xl shadow-xl my-8 max-h-[calc(100vh-4rem)] flex flex-col animate-modalIn`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <Dialog.Title className="text-sm font-semibold text-gray-900">
              {title}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            {children}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 2: Rewrite Tabs.tsx**

```tsx
import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 pb-3 pt-0 text-sm transition-colors border-b-2
                ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>{activeTabContent}</div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite ToastContainer.tsx**

```tsx
import { CheckCircle, XCircle, WarningCircle, Info, X } from '@phosphor-icons/react';
import { useToast } from '../../contexts/ToastContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: string) => {
    const cls = 'w-5 h-5 flex-shrink-0';
    switch (type) {
      case 'success': return <CheckCircle size={20} className="text-emerald-500" />;
      case 'error':   return <XCircle size={20} className="text-red-500" />;
      case 'warning': return <WarningCircle size={20} className="text-amber-500" />;
      case 'info':    return <Info size={20} className="text-blue-500" />;
      default:        return null;
    }
  };

  const getLeftBorder = (type: string) => {
    switch (type) {
      case 'success': return 'border-l-4 border-emerald-500';
      case 'error':   return 'border-l-4 border-red-500';
      case 'warning': return 'border-l-4 border-amber-500';
      case 'info':    return 'border-l-4 border-blue-500';
      default:        return 'border-l-4 border-gray-200';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl
            bg-white shadow-lg ring-1 ring-black/[0.05]
            min-w-[320px] max-w-md
            animate-slideInRight
            ${getLeftBorder(toast.type)}
          `}
        >
          {getIcon(toast.type)}
          <p className="flex-1 text-sm font-medium text-gray-900">
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite LoadingSpinner.tsx — fix border-3 bug**

```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',  // Fixed: border-3 is not a valid Tailwind class
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`
          ${sizeClasses[size]}
          border-gray-200 border-t-gray-900
          rounded-full
          animate-spin
        `}
      />
    </div>
  );
}
```

- [ ] **Step 5: Update Button.tsx — add ghost variant**

The `.btn-primary`, `.btn-secondary`, `.btn-danger` classes are handled by `index.css` (Task 2). Just add the `ghost` variant:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  as?: 'button' | 'span';
  children: React.ReactNode;
  className?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  as: Component = 'button',
  children,
  className = '',
  ...props
}: ButtonProps) {
  let variantClasses = '';

  switch (variant) {
    case 'primary':
      variantClasses = 'btn-primary';
      break;
    case 'secondary':
      variantClasses = 'btn-secondary';
      break;
    case 'danger':
      variantClasses = 'btn-danger';
      break;
    case 'ghost':
      variantClasses = 'btn-ghost';
      break;
  }

  return (
    <Component
      className={`${variantClasses} ${className}`}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </Component>
  );
}
```

- [ ] **Step 6: Verify build**

```bash
cd client && npm run build
```

Expected: Build succeeds. Modal, Tabs, Toast, Spinner all compile.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/
git commit -m "feat: redesign all UI primitives to light theme — Modal, Tabs, Toast, Spinner, Button"
```

---

## Task 5: AppLayout.tsx

**Files:**
- Modify: `client/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Rewrite AppLayout.tsx**

```tsx
import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  SquaresFour,
  Briefcase,
  Users,
  Plus,
  Wrench,
  Package,
  Factory,
  Monitor,
} from '@phosphor-icons/react';
import QuickAddJobModal from '../jobs/QuickAddJobModal';

export default function AppLayout() {
  const location = useLocation();
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: SquaresFour },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Engineering', href: '/engineering', icon: Wrench },
    { name: 'Supply Chain', href: '/supply-chain', icon: Package },
    { name: 'Production', href: '/production', icon: Factory },
    { name: 'Station Kiosks', href: '/station-kiosks', icon: Monitor },
    { name: 'Clients', href: '/clients', icon: Users },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-[220px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-sm font-semibold tracking-tight text-gray-900">CAPSULE</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Manufacturing MES</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm
                  ${
                    active
                      ? 'bg-gray-900 text-white font-medium'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon size={18} weight="light" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="text-[11px] text-gray-400">
            <p>v1.0.0</p>
            <p className="mt-1">&copy; 2025 Capsule MES</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">
              {navigation.find((item) => isActive(item.href))?.name || 'Capsule MES'}
            </h2>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddJobModalOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-[10px] flex items-center gap-2 transition-colors active:scale-[0.98]"
              >
                <Plus size={16} />
                New Job
              </button>

              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">AD</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 animate-fadeIn">
          <Outlet />
        </main>
      </div>

      <QuickAddJobModal
        isOpen={isAddJobModalOpen}
        onClose={() => setIsAddJobModalOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/AppLayout.tsx
git commit -m "feat: redesign AppLayout sidebar and header to light theme with Phosphor icons"
```

---

## Task 6: Pages Batch 1 — Dashboard, Jobs, JobDetail

**Files:**
- Modify: `client/src/pages/Dashboard.tsx`
- Modify: `client/src/pages/Jobs.tsx`
- Modify: `client/src/pages/JobDetail.tsx`

**Pattern to apply in each file:**

1. **Replace Lucide imports** with Phosphor equivalents (see spec icon mapping table)
2. **Replace dark background classes:**
   - `bg-gray-900` → `bg-gray-100` (page bg — usually not needed as AppLayout handles it)
   - `bg-gray-800` → `bg-white`
   - `bg-gray-700` → `bg-gray-50`
3. **Replace border classes:** `border-gray-700` → `border-gray-100`, `border-gray-800` → `border-gray-100`
4. **Replace text classes:** `text-gray-100` → `text-gray-900`, `text-gray-300` → `text-gray-600`, `text-gray-400` → `text-gray-500`
5. **Cards:** `bg-gray-800 border border-gray-700 rounded-lg` → `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02]`
6. **Metric values:** update to `text-3xl font-bold tracking-tighter text-gray-900`
7. **Metric labels:** update to `text-[11px] uppercase tracking-wider font-medium text-gray-400`
8. **Page titles:** `text-2xl font-bold tracking-tight text-gray-900`
9. **Section headers / table headers:** `text-[11px] uppercase tracking-wider font-medium text-gray-400`
10. **Table rows:** `text-sm text-gray-600 border-b border-gray-50 hover:bg-gray-50 transition-colors`
11. **Input search bars:** update per Input.tsx pattern (already done via shared component — verify className overrides are also updated)
12. **Workflow progress bars:** Completed dot `bg-emerald-500`, In Progress `bg-amber-500`, Not Started `bg-gray-200`, connectors `bg-gray-100` → `bg-emerald-500` for completed

- [ ] **Step 1: Update Dashboard.tsx**

Read the file, then apply the pattern above. Key specifics:
- Replace all `lucide-react` imports with `@phosphor-icons/react`
- Metric cards: wrap in `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5`
- Icon size: `size={20} weight="light"` on metric card icons
- Metric values: `text-3xl font-bold tracking-tighter text-gray-900`

- [ ] **Step 2: Update Jobs.tsx**

Read the file, then apply the pattern above. Key specifics:
- Search input: ensure it uses the Input component or has `ring-1 ring-gray-200 rounded-[10px]`
- Filter buttons/dropdowns: use Select component or update manually
- Job list container: `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden`

- [ ] **Step 3: Update JobDetail.tsx**

Read the file, then apply the pattern above. Key specifics:
- Workflow progress stepper: update dot colors and connector colors per spec
- Status badges: will auto-update via Badge component
- Tab container uses Tabs component (already updated)

- [ ] **Step 4: Verify build**

```bash
cd client && npm run build
```

Expected: Zero TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Dashboard.tsx client/src/pages/Jobs.tsx client/src/pages/JobDetail.tsx
git commit -m "feat: migrate Dashboard, Jobs, JobDetail to light theme with Phosphor icons"
```

---

## Task 7: Pages Batch 2 — Engineering, SupplyChain, Production, Clients

**Files:**
- Modify: `client/src/pages/Engineering.tsx`
- Modify: `client/src/pages/SupplyChain.tsx`
- Modify: `client/src/pages/Production.tsx`
- Modify: `client/src/pages/Clients.tsx`

Apply the same pattern from Task 6 to each file. Read each file before editing.

**Engineering.tsx specifics:**
- Stage filter tabs: update to border-b style per Tabs pattern
- BOM import area: `bg-white rounded-2xl` container

**SupplyChain.tsx specifics:**
- Job priority list / sortable cards: update card containers
- Supply Chain stage filter: update color classes

**Production.tsx specifics:**
- Production grid/list: update card containers

**Clients.tsx specifics:**
- Client table: `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden`
- Table header: `text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3 border-b border-gray-100`

- [ ] **Step 1: Update Engineering.tsx** (read file, apply pattern)
- [ ] **Step 2: Update SupplyChain.tsx** (read file, apply pattern)
- [ ] **Step 3: Update Production.tsx** (read file, apply pattern)
- [ ] **Step 4: Update Clients.tsx** (read file, apply pattern)

- [ ] **Step 5: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Engineering.tsx client/src/pages/SupplyChain.tsx client/src/pages/Production.tsx client/src/pages/Clients.tsx
git commit -m "feat: migrate Engineering, SupplyChain, Production, Clients pages to light theme"
```

---

## Task 8: Pages Batch 3 — Remaining Pages + Kiosk Pages

**Files:**
- Modify: `client/src/pages/PartsTracking.tsx`
- Modify: `client/src/pages/RouteTemplates.tsx`
- Modify: `client/src/pages/PartDetail.tsx`
- Modify: `client/src/pages/StationKiosks.tsx`
- Modify: `client/src/pages/kiosk/StationLogin.tsx`
- Modify: `client/src/pages/kiosk/MachineSelect.tsx`
- Modify: `client/src/pages/kiosk/StationDashboard.tsx`

Apply the same pattern from Task 6 to the first four files.

**Kiosk pages (StationLogin, MachineSelect, StationDashboard) — additional requirements:**
- These are full-screen, no sidebar (kiosk layout)
- Larger tap targets: buttons `py-3 px-6 text-base` minimum
- Larger text: `text-lg` body, `text-2xl` headings
- **StationLogin PIN pad:** large grid buttons `w-16 h-16 text-2xl rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 active:scale-[0.97] transition-all`
- Page background: `bg-gray-100 min-h-screen`
- Apply same light theme color swaps

- [ ] **Step 1: Update PartsTracking.tsx** (read file, apply pattern)
- [ ] **Step 2: Update RouteTemplates.tsx** (read file, apply pattern)
- [ ] **Step 3: Update PartDetail.tsx** (read file, apply pattern)
- [ ] **Step 4: Update StationKiosks.tsx** (read file, apply pattern)
- [ ] **Step 5: Update kiosk/StationLogin.tsx** (read file, apply pattern + kiosk adaptations)
- [ ] **Step 6: Update kiosk/MachineSelect.tsx** (read file, apply pattern + kiosk adaptations)
- [ ] **Step 7: Update kiosk/StationDashboard.tsx** (read file, apply pattern + kiosk adaptations)

- [ ] **Step 8: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/PartsTracking.tsx client/src/pages/RouteTemplates.tsx client/src/pages/PartDetail.tsx client/src/pages/StationKiosks.tsx client/src/pages/kiosk/
git commit -m "feat: migrate remaining pages and kiosk pages to light theme"
```

---

## Task 9: Feature Components — jobs/

**Files (10):**
- `client/src/components/jobs/JobCard.tsx`
- `client/src/components/jobs/EngineeringJobCard.tsx`
- `client/src/components/jobs/ProductionJobCard.tsx`
- `client/src/components/jobs/SupplyChainJobCard.tsx`
- `client/src/components/jobs/QuickAddJobModal.tsx`
- `client/src/components/jobs/EditJobModal.tsx`
- `client/src/components/jobs/tabs/MaterialsTab.tsx`
- `client/src/components/jobs/tabs/OverviewTab.tsx`
- `client/src/components/jobs/tabs/ProductionTab.tsx`
- `client/src/components/jobs/tabs/SupplyChainTab.tsx`

Apply the same pattern from Task 6 (icon replacement + dark→light class swap) to each file. Read each file before editing.

**Job cards specifics:**
- Card wrapper: `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5 hover:shadow-md transition-shadow duration-200`
- Priority badges: use `<Badge variant="priority" priority={job.priority}>` (already updated)
- Status badges: use `<Badge variant="status" status={stage.status}>` (already updated)

**Modals (QuickAddJobModal, EditJobModal):**
- Use the Modal component (already updated) — just update any inline dark classes within the modal body
- Form labels: `text-sm font-medium text-gray-700`
- Form inputs: use Input component (already updated)

**Tab components:**
- Table containers: `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden`
- Table headers: `text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3 border-b border-gray-100`
- Table rows: `text-sm text-gray-600 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors`
- Empty state text: `text-sm text-gray-400`

- [ ] **Step 1: Update all 10 jobs/ files** (read each, apply pattern)
- [ ] **Step 2: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/jobs/
git commit -m "feat: migrate jobs/ components to light theme with Phosphor icons"
```

---

## Task 10: Feature Components — engineering/

**Files (15):**
- `client/src/components/engineering/AddBomItemModal.tsx`
- `client/src/components/engineering/EditBomItemModal.tsx`
- `client/src/components/engineering/AddPbomItemModal.tsx`
- `client/src/components/engineering/EditPbomItemModal.tsx`
- `client/src/components/engineering/GeneratePartsModal.tsx`
- `client/src/components/engineering/InitializePartsModal.tsx`
- `client/src/components/engineering/SendToProductionModal.tsx`
- `client/src/components/engineering/ManageEngineersModal.tsx`
- `client/src/components/engineering/BomItemsTable.tsx`
- `client/src/components/engineering/BomImport.tsx`
- `client/src/components/engineering/PbomImport.tsx`
- `client/src/components/engineering/PbomTableEngineering.tsx`
- `client/src/components/engineering/DesignMilestones.tsx`
- `client/src/components/engineering/WorkOrderFiles.tsx`
- `client/src/components/engineering/RecutsTab.tsx`

Apply the same pattern (icon replacement + dark→light class swap). Read each file before editing.

**BomImport / PbomImport specifics (file upload areas):**
- Drop zone: `border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-gray-400 hover:bg-gray-50 transition-colors`
- Upload icon: `<UploadSimple size={24} className="text-gray-400" />`

**Table components (BomItemsTable, PbomTableEngineering):**
- Same table pattern as Task 9 tab components
- Action buttons (edit/delete): use ghost pattern — `text-gray-400 hover:text-gray-700 transition-colors`

**DesignMilestones:**
- Milestone rows: update to light border/bg pattern
- Status indicators: use Badge component

- [ ] **Step 1: Update all 15 engineering/ files** (read each, apply pattern)
- [ ] **Step 2: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/engineering/
git commit -m "feat: migrate engineering/ components to light theme with Phosphor icons"
```

---

## Task 11: Feature Components — supplychain/

**Files (10):**
- `client/src/components/supplychain/AddInventoryModal.tsx`
- `client/src/components/supplychain/EditInventoryModal.tsx`
- `client/src/components/supplychain/EditOrderModal.tsx`
- `client/src/components/supplychain/ReceiveOrderModal.tsx`
- `client/src/components/supplychain/EditPbomItemModalSupplyChain.tsx`
- `client/src/components/supplychain/PbomTableSupplyChain.tsx`
- `client/src/components/supplychain/GlobalInventoryPanel.tsx`
- `client/src/components/supplychain/SortableJobCard.tsx`
- `client/src/components/supplychain/MassOrderModal.tsx`
- `client/src/components/supplychain/OrderTrackingPanel.tsx`

Apply the same pattern. Read each file before editing.

**SortableJobCard specifics:**
- Drag handle: `<DotsSixVertical size={16} className="text-gray-400" />`
- Card: `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-4 hover:shadow-md transition-shadow`

**OrderTrackingPanel / GlobalInventoryPanel:**
- Panel containers: `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden`
- Expandable rows: `bg-gray-50` when expanded

- [ ] **Step 1: Update all 10 supplychain/ files** (read each, apply pattern)
- [ ] **Step 2: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/supplychain/
git commit -m "feat: migrate supplychain/ components to light theme with Phosphor icons"
```

---

## Task 12: Feature Components — parts-tracking/, clients/, production/, kiosk/, contexts

**Files (12):**
- `client/src/components/parts-tracking/BulkCreatePartsModal.tsx`
- `client/src/components/parts-tracking/RouteTemplateModal.tsx`
- `client/src/components/parts-tracking/ScrapPartModal.tsx`
- `client/src/components/parts-tracking/JobPartsPanel.tsx`
- `client/src/components/parts-tracking/StationCheckInOut.tsx`
- `client/src/components/parts-tracking/RouteStepEditor.tsx`
- `client/src/components/clients/AddClientModal.tsx`
- `client/src/components/clients/EditClientModal.tsx`
- `client/src/components/production/ProductionProjects.tsx`
- `client/src/components/kiosk/KioskPartModal.tsx`
- `client/src/contexts/ToastContext.tsx`
- `client/src/contexts/KioskContext.tsx`

Apply the same pattern (icon replacement + dark→light class swap). Read each file before editing.

**StationCheckInOut specifics (kiosk component):**
- Larger text and tap targets (same kiosk rules as Task 8 kiosk pages)
- Part scan input: large, prominent `text-lg py-3`

**KioskPartModal:**
- Uses Modal component (already updated) — update any inline dark classes in modal body
- Part info display: larger text for readability

**Contexts (ToastContext, KioskContext):**
- These are mostly logic files — check for any hardcoded color strings in toast type definitions and update if present
- `KioskContext.tsx` likely has minimal visual changes

- [ ] **Step 1: Update all 12 remaining component/context files** (read each, apply pattern)
- [ ] **Step 2: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/parts-tracking/ client/src/components/clients/ client/src/components/production/ client/src/components/kiosk/ client/src/contexts/
git commit -m "feat: migrate remaining components and contexts to light theme with Phosphor icons"
```

---

## Task 13: Cleanup — Remove Lucide, Update DESIGN_SYSTEM.md, Final Verification

**Files:**
- Modify: `client/package.json`
- Modify: `DESIGN_SYSTEM.md`

- [ ] **Step 1: Verify no Lucide imports remain**

```bash
cd client && grep -r "lucide-react" src/ --include="*.tsx" --include="*.ts"
```

Expected: No output. If any files remain, update them now using the icon mapping table in the spec.

- [ ] **Step 2: Remove lucide-react from package.json**

```bash
cd client && npm uninstall lucide-react
```

- [ ] **Step 3: Verify build still passes**

```bash
cd client && npm run build
```

Expected: Build succeeds with zero TypeScript errors. This is the final confirmation that all Lucide imports have been replaced.

- [ ] **Step 4: Update DESIGN_SYSTEM.md**

Replace the contents to reflect the new Soft Structural light theme. Key sections to update:
- **Colors** section: update all dark token values to light equivalents
- **Component Patterns** section: update card, button, input, badge patterns to new classes
- **Critical Design Rules** section: update rules to reflect light theme (e.g., "No dark card backgrounds", "Rounded-2xl cards", "Phosphor icons only")
- Note the typography change: `text-3xl` is now allowed for metric values (overrides old `text-2xl` cap)

- [ ] **Step 5: Final build verification**

```bash
cd client && npm run build 2>&1 | tail -20
```

Expected output includes: `✓ built in` with no errors. If any errors appear, fix them before proceeding.

- [ ] **Step 6: Final commit**

```bash
git add client/package.json client/package-lock.json DESIGN_SYSTEM.md
git commit -m "feat: remove lucide-react, update DESIGN_SYSTEM.md for Soft Structural light theme

Complete frontend redesign:
- Dark gray-900 theme → Soft Structural light (white cards, gray-100 bg)
- Geist font + @phosphor-icons/react (light weight)
- rounded-2xl cards with shadow-sm + hairline ring
- Soft-tinted status pill badges
- Subtle motion: fadeIn pages, modalIn modals, slideInRight toasts
- Active nav: bg-gray-900 pill (replaces blue left border)
- Fixed LoadingSpinner border-3 → border-2 bug"
```

---

## Success Verification Checklist

After all tasks complete, verify:

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] No `lucide-react` imports remain: `grep -r "lucide-react" client/src/`
- [ ] No dark bg classes on page backgrounds: `grep -r "bg-gray-900\|bg-gray-800" client/src/pages/`
- [ ] All cards use rounded-2xl: spot-check 3-4 pages visually
- [ ] Status badges are soft-tinted pills (not dot+text)
- [ ] Geist font renders in browser (check DevTools → Fonts)
- [ ] Modal opens with scale animation, toast slides in from right
- [ ] Kiosk pages remain full-screen with larger tap targets

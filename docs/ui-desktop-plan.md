# Kwings Accounts: "Desktop" UI Plan

Status: **built** (phases 1–4). Not done: Mac-style sheets for forms, a global date range in the menu bar, app-wide dark mode.

## 1. The idea

Replace the sidebar-and-pages layout with a desktop that feels like a Mac:

- **Wallpaper** fills the screen.
- **Menu bar** across the top (Kwings logo, the focused app's name, a clock, the user menu).
- **Dock** along the bottom with an icon for each app: Dashboard, Accounts, Transactions, Dues, Projects, Investments, Reports, Settings.
- Each section opens as a **window** you can drag, resize, minimize, maximize, close, and stack.
- **Widgets** sit on the bare desktop, so the key numbers are visible before any app is opened.
- **Spotlight** (search box) opens any app or quick action from the keyboard.

Why it suits this app: an accountant usually has two things open at once, such as a report beside the transaction list or an account beside a project. Windows make that natural; the current layout shows one page at a time.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◆ Kwings   Transactions   File  View              Tue 20 Oct 10:42 R │  ← menu bar
├──────────────────────────────────────────────────────────────────────┤
│  ┌─ widgets ─────────┐      ┌● ● ● Transactions ──────────────────┐  │
│  │ Balance  LKR 1.2M │      │ [All] [Income] [Expense]   Search…  │  │
│  │ To receive  450k  │      │ 20 Oct  Hosting   Bank   -12,000    │  │
│  │ To pay       38k  │      │ 18 Oct  Web dev   Bank  +150,000    │  │
│  └───────────────────┘      │ …                                    │  │
│                ┌● ● ● Dashboard ──────────┐                       │  │
│                │ chart chart chart        │───────────────────────┘  │
│   wallpaper    │                          │                          │
│                └──────────────────────────┘                          │
│        ┌────────────────────────────────────────────────┐            │
│        │ 📊  💳  ⇄  🗓  💼  🐷  📄  ⚙        │  ← dock      │
│        └────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. The building blocks

| Piece           | Behaviour                                                                                                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wallpaper**   | A few built-in options (gradients and photos) plus "upload your own". The choice is saved per browser. Text over the wallpaper sits on a frosted panel (`backdrop-blur`) so it stays readable.                                                                       |
| **Menu bar**    | Left: logo menu (About, Settings, Lock, Log out), then the focused app's name and its menus (e.g. Transactions → "New income", "New expense", "Export CSV"). Right: date range picker, clock, user avatar.                                                           |
| **Dock**        | Icons scale up slightly on hover (the Mac magnify effect, in CSS only). A dot under an icon means that app is open. Clicking an open app focuses it, or restores it if minimized. A badge shows counts, e.g. the Dues icon shows the number of overdue items in red. |
| **Window**      | Traffic-light buttons: 🔴 close, 🟡 minimize, 🟢 maximize. Drag by the title bar; resize from edges and corners. Double-clicking the title bar maximizes. Clicking a window brings it to the front. Windows remember their position and size.                        |
| **Minimize**    | The window shrinks into its dock icon (a short CSS transform, about 200 ms) and stays mounted, so filters and scroll position survive.                                                                                                                               |
| **Maximize**    | Fills the area between the menu bar and the dock. Clicking again restores the old size and position.                                                                                                                                                                 |
| **Widgets**     | Small frosted cards on the desktop: total balance, to receive/to pay (with overdue), this month's profit, the next 3 bills. Clicking one opens the matching app.                                                                                                     |
| **Spotlight**   | Ctrl/⌘ + K. Type to open an app, jump to an account or project, or run an action ("new expense", "pay hosting bill").                                                                                                                                                |
| **Launchpad**   | A full-screen grid of all apps, for touch screens and anyone who prefers not to use the dock.                                                                                                                                                                        |
| **Lock screen** | The login page shows the wallpaper, a clock, and a frosted password box.                                                                                                                                                                                             |

## 3. Phone and tablet (important)

Dragging windows does not work on a phone. Below 1024 px wide the same pieces change form:

- **Home screen** (like iOS): wallpaper, widgets at the top, a grid of app icons.
- Tapping an app opens it **full screen** with a back gesture or button to return home. No floating windows.
- The dock becomes a fixed bottom bar holding the 4 most-used apps.

One component tree, two layouts: windows on desktop, full-screen "apps" on mobile.

## 4. How it fits the current code

The current pages stay as they are; the only change is where they render.

1. **Pages become app components.** Move each `app/(app)/<name>/page.tsx` body into `components/apps/<Name>.tsx`. The page file keeps a one-line re-export, so deep links like `/transactions?type=income` still work and open with that window focused.
2. **Window manager**: one React context (`WindowProvider`) holding `{ app, x, y, w, h, z, state: 'normal' | 'minimized' | 'maximized' }` for each open window. Saved to `localStorage` so the desktop comes back as you left it. One window per app (like most Mac apps), which keeps it simple.
3. **Drag and resize** with plain pointer events (`onPointerDown` / `setPointerCapture`). **No new dependencies**: no window library, no animation library. Tailwind transitions cover minimize and maximize.
4. **Windows refresh each other.** Adding an expense in Transactions has to update the Dashboard and the widgets. One small change does it: `api()` sends a `ka:changed` event after any successful write, and `useApi` reloads when it hears that event. This is about 6 lines in `lib/api.ts`.
5. **Forms and dialogs**: they keep the current `<dialog>` modals for phase 1. Later they could become Mac-style "sheets" that slide down from the window's title bar.
6. **Global date range** moves into the menu bar and applies to every window. The per-page date filter remains as an override.

## 5. Keyboard

Browsers reserve ⌘W / ⌘M / ⌘Q (closing the browser tab, minimizing Chrome), and a web page cannot reliably take them over. So:

| Action               | Shortcut          |
| -------------------- | ----------------- |
| Spotlight            | ⌘/Ctrl + K        |
| Close focused window | Alt + W           |
| Minimize             | Alt + M           |
| Maximize / restore   | Alt + Enter       |
| Cycle windows        | Alt + `           |
| New income / expense | Alt + I / Alt + E |

## 6. Accessibility and safety rails

- Windows are `role="dialog"` with a label; focus moves into the window that's brought to the front; traffic-light buttons have `aria-label`s and a visible focus ring.
- `prefers-reduced-motion` turns off the minimize animation and the dock magnify effect.
- A **"Classic layout"** switch in Settings brings back the current sidebar layout, as a fallback if the desktop feels like too much for daily bookkeeping.
- Money always stays on readable solid surfaces; glass and blur are only for chrome (menu bar, dock, widgets).

## 7. A conflict to decide on

`requrement.md` §5 says: _"Prioritize usability over visual complexity"_, _"Do not add unnecessary animations or decorative components"_. A desktop UI is a deliberate departure from that. The plan keeps the risk low (no new dependencies, the same pages inside, a classic-layout fallback, short animations), but it's your decision to override the spec.

## 8. Build phases

| Phase                      | Scope                                                                                                                        | Size                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **1. Desktop shell**       | Wallpaper, menu bar, dock, windows (open/close/focus/drag/minimize/maximize), pages moved into windows, cross-window refresh | Largest step, ~1 day |
| **2. Widgets + Spotlight** | Desktop widgets, ⌘K launcher with apps + quick actions, overdue badge on the dock                                            | ~½ day               |
| **3. Mobile home screen**  | iOS-style grid, full-screen apps, bottom dock                                                                                | ~½ day               |
| **4. Polish**              | Wallpaper picker and upload, lock-screen login, window resize from all edges, saved layouts, classic-layout toggle           | ~½ day               |

## 9. Open questions for you

1. **Wallpaper**: a Kwings-branded set (navy and blue gradients), nature photos, or both?
2. **Light, dark, or follow the system?** macOS-style dark mode works especially well with wallpapers.
3. **One window per app** (simpler, recommended), or allow e.g. two Reports windows side by side?
4. **Keep the "Classic layout" fallback**, or go all-in on the desktop?

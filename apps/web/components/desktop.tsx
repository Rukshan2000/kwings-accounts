'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  ChevronLeft,
  LayoutGrid,
  LogOut,
  Minus,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { APPS, resolve, type AppDef } from '@/lib/apps';
import { api, qs, useApi } from '@/lib/api';
import { date, money, startOfMonth, today } from '@/lib/format';
import { useRefs } from '@/lib/refs';
import type { Due, Outstanding, Page, Totals } from '@/lib/types';
import { InWindow } from './ui';
import { useLayoutPref, Wallpaper } from './wallpaper';

const MENU_H = 28;
const DOCK_H = 92; // space new windows leave free for the dock
const MIN_W = 420;
const MIN_H = 280;
const STORE = 'ka.windows';

type Win = {
  key: string;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  state: 'normal' | 'min' | 'max';
};
type Rect = Pick<Win, 'x' | 'y' | 'w' | 'h'>;

/** The URL always names the focused window. replaceState keeps Next's hooks in sync without a page load. */
const go = (url: string) => window.history.replaceState(null, '', url);
/** One-shot params (open a form) must not reopen it on every reload. */
const stable = (url: string) => {
  const u = new URL(url, 'http://x');
  u.searchParams.delete('new');
  u.searchParams.delete('t');
  return u.pathname + u.search;
};
const quick = (type: 'income' | 'expense') => `/transactions?new=${type}&t=${Date.now()}`;

function load(): Win[] {
  try {
    const wins = JSON.parse(localStorage.getItem(STORE) ?? '[]');
    return Array.isArray(wins) ? wins.filter((w) => resolve(w.url)) : [];
  } catch {
    return [];
  }
}

const byZ = (wins: Win[]) => [...wins].sort((a, b) => a.z - b.z);
const topOf = (wins: Win[]) => byZ(wins.filter((w) => w.state !== 'min')).at(-1);

/** Brings a window to the front (restoring it if minimized); no-op if it already is. */
function raise(wins: Win[], key: string, url?: string): Win[] {
  const cur = wins.find((w) => w.key === key);
  if (!cur) return wins;
  const isTop = topOf(wins)?.key === key;
  if (isTop && (!url || url === cur.url)) return wins;
  const z = Math.max(...wins.map((w) => w.z)) + 1;
  return wins.map((w) =>
    w === cur
      ? { ...w, url: url ?? w.url, z: isTop ? w.z : z, state: w.state === 'min' ? 'normal' : w.state }
      : w,
  );
}

export function Desktop() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const url = pathname + (search ? `?${search}` : '');
  const [wins, setWins] = useState<Win[]>(load);
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [overlay, setOverlay] = useState<'spotlight' | 'launchpad' | null>(null);
  const { accounts } = useRefs();
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name;
  const top = topOf(wins);

  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify(wins.map((w) => ({ ...w, url: stable(w.url) }))));
      } catch {
        /* layout just won't be remembered */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [wins]);

  // Any navigation (links inside windows, back/forward, deep links) opens or focuses that window.
  useEffect(() => {
    const r = resolve(url);
    if (!r) return;
    setWins((ws) => {
      if (ws.some((w) => w.key === r.key)) return raise(ws, r.key, url);
      const n = ws.length % 6;
      // Open on the left, leaving the widget column (right 320px) visible.
      const w = Math.min(1100, Math.max(MIN_W, window.innerWidth - 380));
      const h = Math.min(760, window.innerHeight - MENU_H - DOCK_H - 40);
      const z = Math.max(0, ...ws.map((x) => x.z)) + 1;
      const x = 24 + n * 32;
      return [...ws, { key: r.key, url, x, y: MENU_H + 16 + n * 28, w, h, z, state: 'normal' }];
    });
  }, [url]);

  const focus = (key: string) => {
    const w = wins.find((x) => x.key === key);
    if (!w) return;
    setWins((ws) => raise(ws, key));
    go(w.url);
  };
  const afterHide = (rest: Win[]) => go(topOf(rest)?.url ?? '/home');
  const close = (key: string) => {
    const rest = wins.filter((w) => w.key !== key);
    setWins(rest);
    afterHide(rest);
  };
  const minimize = (key: string) => {
    const rest = wins.map((w) => (w.key === key ? { ...w, state: 'min' as const } : w));
    setWins(rest);
    afterHide(rest);
  };
  const toggleMax = (key: string) => {
    setWins((ws) =>
      raise(ws, key).map((w) =>
        w.key === key ? { ...w, state: w.state === 'max' ? ('normal' as const) : ('max' as const) } : w,
      ),
    );
    go(wins.find((w) => w.key === key)!.url);
  };
  const update = (key: string, rect: Partial<Rect>) =>
    setWins((ws) => ws.map((w) => (w.key === key ? { ...w, ...rect } : w)));
  /** Dock / Spotlight / Launchpad: reuse an open window as-is unless the URL asks for something specific. */
  const launch = (target: string) => {
    setOverlay(null);
    const r = resolve(target);
    const open = r && wins.find((w) => w.key === r.key);
    if (open && !target.includes('?')) focus(open.key);
    else go(target);
  };
  const cycle = () => {
    const visible = byZ(wins.filter((w) => w.state !== 'min'));
    if (visible.length > 1) focus(visible[0].key);
  };

  const keys = useRef<(e: KeyboardEvent) => void>(null);
  keys.current = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setOverlay((o) => (o === 'spotlight' ? null : 'spotlight'));
      return;
    }
    if (e.key === 'Escape' && overlay) return setOverlay(null);
    if (e.ctrlKey && e.metaKey && e.code === 'KeyF') {
      e.preventDefault();
      return toggleFullScreen();
    }
    // Browsers own ⌘W / ⌘M, so window shortcuts use Alt (Option). e.code ignores Option's special characters.
    if (!e.altKey || e.metaKey || e.ctrlKey) return;
    const actions: Record<string, () => void> = {
      KeyW: () => top && close(top.key),
      KeyM: () => top && minimize(top.key),
      Enter: () => top && toggleMax(top.key),
      Backquote: cycle,
      KeyI: () => launch(quick('income')),
      KeyE: () => launch(quick('expense')),
    };
    if (actions[e.code]) {
      e.preventDefault();
      actions[e.code]();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current?.(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Maximized = edge to edge below the menu bar; the dock auto-hides over it.
  const work = { x: 0, y: MENU_H, w: view.w, h: view.h - MENU_H };
  const rectOf = (w: Win): Rect => {
    if (w.state === 'max') return work;
    const width = Math.min(w.w, work.w);
    const height = Math.min(w.h, work.h);
    return {
      w: width,
      h: height,
      x: Math.min(Math.max(w.x, 120 - width), view.w - 120),
      y: Math.min(Math.max(w.y, MENU_H), view.h - 60),
    };
  };
  const order = byZ(wins).map((w) => w.key);
  const titleOf = (w: Win) => resolve(w.url, accountName)?.title ?? '';

  return (
    <div className="fixed inset-0 overflow-hidden select-none">
      <Wallpaper />
      <MenuBar
        title={top ? titleOf(top) : 'Desktop'}
        wins={byZ(wins).map((w) => ({ key: w.key, title: titleOf(w), active: w.key === top?.key }))}
        hasTop={!!top}
        onFocus={focus}
        onClose={() => top && close(top.key)}
        onMinimize={() => top && minimize(top.key)}
        onZoom={() => top && toggleMax(top.key)}
        onLaunch={launch}
        onOverlay={setOverlay}
      />
      <div className="absolute top-12 right-6 w-72">
        <Widgets onOpen={launch} />
      </div>
      {wins.map((w) => {
        const r = resolve(w.url, accountName);
        if (!r) return null;
        return (
          <Window
            key={w.key}
            win={w}
            rect={rectOf(w)}
            title={r.title}
            appId={r.app.id}
            zIndex={10 + Math.min(order.indexOf(w.key), 20)}
            active={w.key === top?.key}
            onFocus={() => w.key !== top?.key && focus(w.key)}
            onClose={() => close(w.key)}
            onMinimize={() => minimize(w.key)}
            onMaximize={() => toggleMax(w.key)}
            onChange={(rect) => update(w.key, rect)}
          >
            {r.node}
          </Window>
        );
      })}
      <Dock
        autoHide={top?.state === 'max'}
        open={new Set(wins.map((w) => resolve(w.url)?.app.id))}
        onLaunch={(app) => launch(app.href)}
        onLaunchpad={() => setOverlay('launchpad')}
      />
      {overlay === 'spotlight' && <Spotlight onOpen={launch} onClose={() => setOverlay(null)} />}
      {overlay === 'launchpad' && (
        <div
          className="rise fixed inset-0 z-[38] grid place-items-center bg-black/30 p-10 backdrop-blur-2xl"
          onClick={() => setOverlay(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <AppGrid onOpen={(app) => launch(app.href)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Window({
  win,
  rect,
  title,
  appId,
  zIndex,
  active,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onChange,
  children,
}: {
  win: Win;
  rect: Rect;
  title: string;
  appId: string;
  zIndex: number;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onChange: (r: Partial<Rect>) => void;
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const minimized = win.state === 'min';

  /** dir '' moves the window; otherwise any of n/s/e/w resizes from that edge. */
  function start(e: ReactPointerEvent<HTMLElement>, dir: string) {
    if (e.button !== 0 || win.state === 'max' || (e.target as HTMLElement).closest('button')) return;
    const el = e.currentTarget;
    const s = { px: e.clientX, py: e.clientY, ...rect };
    el.setPointerCapture(e.pointerId);
    setDragging(true);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - s.px;
      const dy = ev.clientY - s.py;
      if (!dir) return onChange({ x: s.x + dx, y: Math.max(MENU_H, s.y + dy) });
      const r = { x: s.x, y: s.y, w: s.w, h: s.h };
      if (dir.includes('e')) r.w = Math.max(MIN_W, s.w + dx);
      if (dir.includes('s')) r.h = Math.max(MIN_H, s.h + dy);
      if (dir.includes('w')) {
        r.w = Math.max(MIN_W, s.w - dx);
        r.x = s.x + s.w - r.w;
      }
      if (dir.includes('n')) {
        r.y = Math.min(Math.max(MENU_H, s.y + dy), s.y + s.h - MIN_H);
        r.h = s.y + s.h - r.y;
      }
      onChange(r);
    };
    const end = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      setDragging(false);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // Minimize: shrink towards this app's dock icon.
  let transform: string | undefined;
  if (minimized) {
    const icon = document.querySelector(`[data-dock="${appId}"]`)?.getBoundingClientRect();
    const dx = icon ? icon.x + icon.width / 2 - (rect.x + rect.w / 2) : 0;
    const dy = icon ? icon.y + icon.height / 2 - (rect.y + rect.h / 2) : window.innerHeight;
    transform = `translate(${dx}px, ${dy}px) scale(0.05)`;
  }

  const edges: [string, string][] = [
    ['n', 'top-0 inset-x-3 h-1.5 -translate-y-1/2 cursor-ns-resize'],
    ['s', 'bottom-0 inset-x-3 h-1.5 translate-y-1/2 cursor-ns-resize'],
    ['e', 'right-0 inset-y-3 w-1.5 translate-x-1/2 cursor-ew-resize'],
    ['w', 'left-0 inset-y-3 w-1.5 -translate-x-1/2 cursor-ew-resize'],
    ['ne', 'top-0 right-0 size-3 -translate-y-1/2 translate-x-1/2 cursor-nesw-resize'],
    ['nw', 'top-0 left-0 size-3 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize'],
    ['se', 'bottom-0 right-0 size-3 translate-x-1/2 translate-y-1/2 cursor-nwse-resize'],
    ['sw', 'bottom-0 left-0 size-3 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize'],
  ];

  return (
    <section
      role="dialog"
      aria-label={title}
      aria-hidden={minimized || undefined}
      inert={minimized}
      onPointerDownCapture={onFocus}
      className={`absolute flex flex-col ${dragging ? '' : 'transition-[left,top,width,height,transform,opacity] duration-200 ease-out motion-reduce:transition-none'}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        zIndex,
        transform,
        opacity: minimized ? 0 : 1,
        pointerEvents: minimized ? 'none' : undefined,
      }}
    >
      <div
        className={`flex h-full flex-col overflow-hidden bg-slate-50 ${win.state === 'max' ? '' : 'rounded-xl ring-1 ring-black/10'} ${
          active ? 'shadow-[0_24px_70px_-12px_rgb(0_0_0/0.55)]' : 'shadow-[0_12px_40px_-12px_rgb(0_0_0/0.4)]'
        }`}
      >
        <header
          onPointerDown={(e) => start(e, '')}
          onDoubleClick={onMaximize}
          className="relative flex h-10 shrink-0 cursor-default items-center border-b border-slate-200 bg-white/90 px-3 backdrop-blur"
        >
          <div
            className={`group/l flex gap-2 ${active ? '' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}
          >
            <Light label="Close" color="bg-[#ff5f57]" icon={X} onClick={onClose} />
            <Light label="Minimize" color="bg-[#febc2e]" icon={Minus} onClick={onMinimize} />
            <Light
              label={win.state === 'max' ? 'Restore' : 'Maximize'}
              color="bg-[#28c840]"
              icon={Plus}
              onClick={onMaximize}
            />
          </div>
          <h2
            className={`pointer-events-none absolute inset-x-24 truncate text-center text-sm font-medium ${active ? 'text-slate-800' : 'text-slate-400'}`}
          >
            {title}
          </h2>
        </header>
        <InWindow.Provider value={true}>
          <div key={win.url} className="flex-1 overflow-auto p-5 select-text">
            {children}
          </div>
        </InWindow.Provider>
      </div>
      {edges.map(([dir, cls]) => (
        <div key={dir} aria-hidden className={`absolute ${cls}`} onPointerDown={(e) => start(e, dir)} />
      ))}
    </section>
  );
}

function Light({
  label,
  color,
  icon: Icon,
  onClick,
}: {
  label: string;
  color: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-3 place-items-center rounded-full ring-1 ring-black/15 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${color}`}
    >
      <Icon className="size-2 text-black/60 opacity-0 group-hover/l:opacity-100" strokeWidth={3} />
    </button>
  );
}

type MenuItem = { label: string; shortcut?: string; checked?: boolean; onClick: () => void } | '-';

function Menu({ label, items }: { label: ReactNode; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex h-6 items-center rounded px-2.5 ${open ? 'bg-white/20' : 'hover:bg-white/10'}`}
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-7 left-0 min-w-56 glass glass-light rounded-xl p-1 text-[13px] text-slate-800"
        >
          {items.map((item, i) =>
            item === '-' ? (
              <div key={i} className="my-1 h-px bg-slate-900/10" />
            ) : (
              <button
                key={i}
                role="menuitem"
                onClick={() => (setOpen(false), item.onClick())}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1 text-left hover:bg-blue-600 hover:text-white"
              >
                <span className="w-3">{item.checked ? '✓' : ''}</span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <span className="opacity-60">{item.shortcut}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="tabular-nums">
      {now.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
      {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

/** Browser full screen: hides the browser's own tabs and toolbar too. */
const toggleFullScreen = () =>
  document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen().catch(() => {});

async function logout() {
  await api('/auth/logout', 'POST').catch(() => {});
  window.location.href = '/login';
}

function MenuBar({
  title,
  wins,
  hasTop,
  onFocus,
  onClose,
  onMinimize,
  onZoom,
  onLaunch,
  onOverlay,
}: {
  title: string;
  wins: { key: string; title: string; active: boolean }[];
  hasTop: boolean;
  onFocus: (key: string) => void;
  onClose: () => void;
  onMinimize: () => void;
  onZoom: () => void;
  onLaunch: (url: string) => void;
  onOverlay: (o: 'spotlight' | 'launchpad') => void;
}) {
  const [, setLayout] = useLayoutPref();
  const { data: user } = useApi<{ name: string; email: string }>('/auth/me');
  const windowItems: MenuItem[] = hasTop
    ? [
        { label: 'Minimize', shortcut: '⌥M', onClick: onMinimize },
        { label: 'Zoom', shortcut: '⌥↵', onClick: onZoom },
        { label: 'Close', shortcut: '⌥W', onClick: onClose },
        { label: 'Enter/exit full screen', shortcut: '⌃⌘F', onClick: toggleFullScreen },
      ]
    : [];
  if (wins.length)
    windowItems.push(
      ...(hasTop ? (['-'] as MenuItem[]) : []),
      ...wins.map((w) => ({ label: w.title, checked: w.active, onClick: () => onFocus(w.key) })),
    );
  return (
    <nav
      style={{ height: MENU_H }}
      className="fixed inset-x-0 top-0 z-[35] flex items-center justify-between glass glass-dark px-2 text-[13px] text-white"
    >
      <div className="flex items-center">
        <Menu
          label={<BarChart3 className="size-4" aria-label="Kwings menu" />}
          items={[
            { label: 'Spotlight search', shortcut: '⌘K', onClick: () => onOverlay('spotlight') },
            { label: 'Launchpad', onClick: () => onOverlay('launchpad') },
            '-',
            { label: 'New income', shortcut: '⌥I', onClick: () => onLaunch(quick('income')) },
            { label: 'New expense', shortcut: '⌥E', onClick: () => onLaunch(quick('expense')) },
            '-',
            { label: 'Settings…', onClick: () => onLaunch('/settings') },
            { label: 'Switch to classic layout', onClick: () => setLayout('classic') },
            '-',
            { label: 'Log out', onClick: logout },
          ]}
        />
        <span className="px-2.5 font-semibold">{title}</span>
        {windowItems.length > 0 && <Menu label="Window" items={windowItems} />}
      </div>
      <div className="flex items-center gap-1 pr-1">
        <button
          aria-label="Spotlight search"
          onClick={() => onOverlay('spotlight')}
          className="grid h-6 place-items-center rounded px-2 hover:bg-white/10"
        >
          <Search className="size-3.5" />
        </button>
        <span className="px-2">
          <Clock />
        </span>
        <span className="truncate px-2 font-medium" title={user?.email}>
          {user?.name}
        </span>
      </div>
    </nav>
  );
}

export function AppIcon({ app, className = 'size-12' }: { app: AppDef; className?: string }) {
  const Icon = app.icon;
  return (
    <span
      className={`grid place-items-center rounded-[24%] bg-linear-to-br shadow-lg ring-1 ring-white/25 ring-inset ${app.color} ${className}`}
    >
      <Icon className="size-1/2 text-white drop-shadow" strokeWidth={1.75} />
    </span>
  );
}

function useOverdueCount() {
  return useApi<Page<Due>>('/dues?overdue=true&pageSize=1').data?.total ?? 0;
}

function Dock({
  autoHide,
  open,
  onLaunch,
  onLaunchpad,
}: {
  autoHide: boolean;
  open: Set<string | undefined>;
  onLaunch: (app: AppDef) => void;
  onLaunchpad: () => void;
}) {
  const overdue = useOverdueCount();
  const [peek, setPeek] = useState(false);
  const hidden = autoHide && !peek;
  const item = (
    key: string,
    label: string,
    icon: ReactNode,
    onClick: () => void,
    running = false,
    badge = 0,
  ) => (
    <li key={key} className="group relative flex flex-col items-center">
      <span className="pointer-events-none absolute -top-9 rounded-md bg-slate-900/80 px-2 py-0.5 text-xs whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100">
        {label}
      </span>
      <button
        aria-label={label}
        data-dock={key}
        onClick={onClick}
        className="relative origin-bottom transition-transform duration-150 group-hover:-translate-y-2 group-hover:scale-125 focus-visible:-translate-y-2 focus-visible:outline-none motion-reduce:transition-none"
      >
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white ring-2 ring-white/60">
            {badge}
          </span>
        )}
      </button>
      <span className={`mt-1 size-1 rounded-full ${running ? 'bg-white/90' : 'bg-transparent'}`} />
    </li>
  );
  return (
    <nav
      aria-label="Dock"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[35] flex justify-center pb-2"
      onMouseLeave={() => setPeek(false)}
    >
      {/* Over a maximized window the dock slides away; touching the bottom edge brings it back. */}
      {/* Hidden: a thin strip at the bottom edge. Shown: covers the dock area so leaving it hides the dock. */}
      {autoHide && (
        <div
          className={`pointer-events-auto absolute inset-x-0 bottom-0 ${hidden ? 'h-1.5' : 'h-full'}`}
          onMouseEnter={() => setPeek(true)}
        />
      )}
      <ul
        className={`pointer-events-auto transition-transform duration-200 motion-reduce:transition-none ${hidden ? 'translate-y-[calc(100%+12px)] has-focus-visible:translate-y-0' : ''} flex items-end gap-1.5 glass rounded-3xl px-2 pt-2 pb-1`}
      >
        {APPS.map((app) =>
          item(
            app.id,
            app.label,
            <AppIcon app={app} />,
            () => onLaunch(app),
            open.has(app.id),
            app.id === 'dues' ? overdue : 0,
          ),
        )}
        <li aria-hidden className="mx-1 mb-3 h-10 w-px bg-white/30" />
        {item(
          'launchpad',
          'Launchpad',
          <span className="grid size-12 place-items-center rounded-[24%] bg-white/25 ring-1 ring-white/30 ring-inset">
            <LayoutGrid className="size-6 text-white" />
          </span>,
          onLaunchpad,
        )}
      </ul>
    </nav>
  );
}

export function AppGrid({ onOpen }: { onOpen: (app: AppDef) => void }) {
  const overdue = useOverdueCount();
  return (
    <ul className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-4 lg:gap-x-10">
      {APPS.map((app) => (
        <li key={app.id}>
          <button onClick={() => onOpen(app)} className="group flex w-full flex-col items-center gap-2">
            <span className="relative transition group-hover:scale-105 group-active:scale-95">
              <AppIcon app={app} className="size-14 lg:size-20" />
              {app.id === 'dues' && overdue > 0 && (
                <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
                  {overdue}
                </span>
              )}
            </span>
            <span className="text-center text-xs font-medium text-white drop-shadow lg:text-sm">
              {app.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Spotlight({ onOpen, onClose }: { onOpen: (url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const { accounts, projects } = useRefs();
  const all: { label: string; hint: string; url: string }[] = [
    { label: 'New income', hint: 'Action · ⌥I', url: quick('income') },
    { label: 'New expense', hint: 'Action · ⌥E', url: quick('expense') },
    ...APPS.map((a) => ({ label: a.label, hint: 'App', url: a.href })),
    ...accounts.map((a) => ({ label: a.name, hint: 'Account', url: `/accounts/${a.id}` })),
    ...projects.map((p) => ({
      label: p.name,
      hint: 'Project transactions',
      url: `/transactions?projectId=${p.id}`,
    })),
  ];
  const term = q.trim().toLowerCase();
  const results = all.filter((r) => r.label.toLowerCase().includes(term)).slice(0, 8);
  const pick = (i: number) => results[i] && onOpen(results[i].url);

  return (
    <div className="fixed inset-0 z-[38] flex justify-center bg-black/10 pt-[18vh]" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Spotlight search"
        className="rise h-fit w-full max-w-xl overflow-hidden glass glass-light rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4">
          <Search className="size-5 text-slate-400" />
          <input
            autoFocus
            aria-label="Search apps, accounts, projects and actions"
            className="h-14 flex-1 bg-transparent text-lg text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Spotlight Search"
            value={q}
            onChange={(e) => (setQ(e.target.value), setSel(0))}
            onKeyDown={(e) => {
              const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
              if (step) {
                e.preventDefault();
                setSel((s) => Math.min(Math.max(s + step, 0), results.length - 1));
              }
              if (e.key === 'Enter') pick(sel);
            }}
          />
        </div>
        {results.length > 0 && (
          <ul className="border-t border-slate-900/10 p-1.5">
            {results.map((r, i) => (
              <li key={r.url + r.label}>
                <button
                  onMouseEnter={() => setSel(i)}
                  onClick={() => pick(i)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                    i === sel ? 'bg-blue-600 text-white' : 'text-slate-800'
                  }`}
                >
                  {r.label}
                  <span className={`text-xs ${i === sel ? 'text-white/80' : 'text-slate-400'}`}>
                    {r.hint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Glass({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="block w-full glass rounded-3xl p-4 text-left text-white transition hover:[--glass-tint:rgb(255_255_255/0.2)]"
    >
      {children}
    </button>
  );
}

const caption = 'text-[11px] font-semibold tracking-[0.08em] text-white/70 uppercase';

/** Key numbers on the bare desktop / home screen. Each opens its app. */
export function Widgets({ onOpen }: { onOpen: (url: string) => void }) {
  const d = useApi<{ totals: Totals; totalBalance: string; outstanding: Outstanding }>(
    `/dashboard${qs({ from: startOfMonth(), to: today() })}`,
  ).data;
  const bills = useApi<Page<Due>>('/dues?type=expense&pageSize=3').data?.data;
  if (!d) return null;
  const o = d.outstanding;
  const late = (v: string) => /[1-9]/.test(v);
  return (
    <div className="space-y-3">
      <Glass label="Open accounts" onClick={() => onOpen('/accounts')}>
        <div className={caption}>Total balance</div>
        <div className="mt-1 font-display text-2xl font-medium tabular-nums">{money(d.totalBalance)}</div>
      </Glass>
      <Glass label="Open dues" onClick={() => onOpen('/dues')}>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['To receive', o.receivable, o.overdue_receivable],
              ['To pay', o.payable, o.overdue_payable],
            ] as const
          ).map(([name, total, overdue]) => (
            <div key={name}>
              <div className={caption}>{name}</div>
              <div className="mt-1 text-sm font-medium tabular-nums">{money(total, false)}</div>
              {late(overdue) && <div className="text-xs text-red-200">{money(overdue, false)} late</div>}
            </div>
          ))}
        </div>
      </Glass>
      <Glass label="Open dashboard" onClick={() => onOpen('/dashboard')}>
        <div className={caption}>This month</div>
        <div className="mt-1 font-display text-xl font-medium tabular-nums">{money(d.totals.profit)}</div>
        <div className="mt-1 flex gap-4 text-xs text-white/80 tabular-nums">
          <span className="flex items-center gap-1">
            <TrendingUp className="size-3" /> {money(d.totals.income, false)}
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown className="size-3" /> {money(d.totals.expenses, false)}
          </span>
        </div>
      </Glass>
      {!!bills?.length && (
        <Glass label="Open bills" onClick={() => onOpen('/dues')}>
          <div className={caption}>Upcoming bills</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {bills.map((b) => (
              <li key={b.id} className="flex justify-between gap-3">
                <span className="truncate">
                  <span className={b.due_date < today() ? 'text-red-200' : 'text-white/70'}>
                    {date(b.due_date)}
                  </span>{' '}
                  {b.description || b.category_name}
                </span>
                <span className="tabular-nums">{money(b.amount, false)}</span>
              </li>
            ))}
          </ul>
        </Glass>
      )}
    </div>
  );
}

const MOBILE_DOCK = ['dashboard', 'transactions', 'dues', 'accounts'];

/** Phones / tablets: iOS-style home screen, apps open full screen. */
export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const app = resolve(pathname)?.app;
  const home = pathname === '/home' || !app;

  return (
    <>
      <Wallpaper />
      {home ? (
        <main className="rise mx-auto min-h-screen max-w-xl px-4 pt-8 pb-32">
          <div className="mb-6 flex items-center justify-between text-white">
            <div className="text-3xl font-light">
              <Clock />
            </div>
            <button aria-label="Log out" onClick={logout} className="rounded-full p-2 hover:bg-white/10">
              <LogOut className="size-5" />
            </button>
          </div>
          <Widgets onOpen={(u) => router.push(u)} />
          <div className="mt-8">
            <AppGrid onOpen={(a) => router.push(a.href)} />
          </div>
        </main>
      ) : (
        <>
          <header className="sticky top-0 z-20 flex h-12 items-center gap-2 glass glass-dark px-2 text-white">
            <Link
              href="/home"
              aria-label="Home"
              className="flex items-center rounded-lg p-1.5 hover:bg-white/10"
            >
              <ChevronLeft className="size-5" /> <span className="text-sm">Home</span>
            </Link>
            <h1 className="flex-1 truncate pr-16 text-center text-sm font-semibold">{app.label}</h1>
          </header>
          <main key={pathname} className="rise min-h-screen bg-slate-50 px-4 py-5 pb-32">
            <InWindow.Provider value={true}>{children}</InWindow.Provider>
          </main>
        </>
      )}
      <nav aria-label="Dock" className="fixed inset-x-3 bottom-3 z-30">
        <ul className="mx-auto flex max-w-md justify-around glass rounded-[2rem] p-2.5">
          {APPS.filter((a) => MOBILE_DOCK.includes(a.id)).map((a) => (
            <li key={a.id}>
              <Link href={a.href} aria-label={a.label} aria-current={app?.id === a.id ? 'page' : undefined}>
                <AppIcon app={a} className={`size-12 ${app?.id === a.id ? 'ring-2 ring-white' : ''}`} />
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/home"
              aria-label="All apps"
              className="grid size-12 place-items-center rounded-[24%] bg-white/25"
            >
              <LayoutGrid className="size-6 text-white" />
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}

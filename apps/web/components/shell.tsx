'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Settings,
  Wallet,
  X,
} from 'lucide-react';
import { api, useApi } from '@/lib/api';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/investments', label: 'Investments', icon: PiggyBank },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '·';

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-blue-400/15 ring-1 ring-blue-400/30">
        <BarChart3 className="size-5 text-blue-400" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-medium text-white">Kwings</span>
        <span className="block text-[10px] font-semibold tracking-[0.2em] text-slate-400 uppercase">
          Accounts
        </span>
      </span>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: user } = useApi<{ name: string; email: string }>('/auth/me');

  async function logout() {
    await api('/auth/logout', 'POST').catch(() => {});
    window.location.href = '/login';
  }

  const sidebar = (
    <nav className="flex h-full flex-col bg-navy-900 text-slate-300">
      <div className="px-5 pt-6 pb-8">
        <Brand />
      </div>
      <p className="px-6 pb-2 text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase">Menu</p>
      <ul className="flex-1 space-y-0.5 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                  active ? 'bg-white/[0.07] text-white' : 'hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {active && (
                  <span className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-blue-400" />
                )}
                <Icon
                  className={`size-[18px] ${active ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="m-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-400 text-sm font-semibold text-navy-950">
            {initials(user?.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{user?.name ?? ' '}</div>
            <div className="truncate text-xs text-slate-400">{user?.email ?? ' '}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="rise absolute inset-y-0 left-0 w-72 shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-navy-900/95 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-white hover:bg-white/10"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      <main key={pathname} className="rise mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}

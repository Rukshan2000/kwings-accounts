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
      <div className="flex items-center gap-2 px-5 py-5 text-white">
        <BarChart3 className="size-6 text-blue-400" />
        <span className="text-lg font-semibold">Kwings Accounts</span>
      </div>
      <ul className="flex-1 space-y-1 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? 'bg-navy-800 text-white' : 'hover:bg-navy-800/60 hover:text-white'
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 p-4">
        <div className="truncate text-sm font-medium text-white">{user?.name ?? ' '}</div>
        <div className="truncate text-xs text-slate-400">{user?.email ?? ' '}</div>
        <button
          onClick={logout}
          className="mt-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white"
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
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-navy-900 px-4 py-3 text-white lg:hidden">
        <span className="font-semibold">Kwings Accounts</span>
        <button aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

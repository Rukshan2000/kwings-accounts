import type { ReactNode } from 'react';
import {
  ArrowLeftRight,
  Briefcase,
  CalendarClock,
  FileText,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import AccountsPage from '@/app/(app)/accounts/page';
import { AccountDetail } from '@/app/(app)/accounts/[id]/account-detail';
import DashboardPage from '@/app/(app)/dashboard/page';
import DuesPage from '@/app/(app)/dues/page';
import InvestmentsPage from '@/app/(app)/investments/page';
import ProjectsPage from '@/app/(app)/projects/page';
import ReportsPage from '@/app/(app)/reports/page';
import SettingsPage from '@/app/(app)/settings/page';
import { Transactions } from '@/app/(app)/transactions/transactions';

export type AppDef = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Icon tile gradient. */
  color: string;
  render: (params: URLSearchParams) => ReactNode;
};

export const APPS: AppDef[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    color: 'from-sky-400 to-blue-600',
    render: () => <DashboardPage />,
  },
  {
    id: 'accounts',
    label: 'Accounts',
    href: '/accounts',
    icon: Wallet,
    color: 'from-emerald-400 to-teal-600',
    render: () => <AccountsPage />,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
    color: 'from-indigo-400 to-violet-600',
    render: (p) => <Transactions params={p} />,
  },
  {
    id: 'dues',
    label: 'Dues & Recurring',
    href: '/dues',
    icon: CalendarClock,
    color: 'from-orange-400 to-rose-500',
    render: () => <DuesPage />,
  },
  {
    id: 'projects',
    label: 'Projects',
    href: '/projects',
    icon: Briefcase,
    color: 'from-amber-300 to-orange-500',
    render: () => <ProjectsPage />,
  },
  {
    id: 'investments',
    label: 'Investments',
    href: '/investments',
    icon: PiggyBank,
    color: 'from-pink-400 to-fuchsia-600',
    render: () => <InvestmentsPage />,
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: FileText,
    color: 'from-cyan-400 to-sky-600',
    render: () => <ReportsPage />,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    color: 'from-slate-400 to-slate-600',
    render: () => <SettingsPage />,
  },
];

export type Resolved = { key: string; app: AppDef; title: string; node: ReactNode };

/**
 * Maps a URL to the window that shows it. One window per app, except account details
 * (one per account). Returns null for URLs that are not apps (e.g. /home).
 */
export function resolve(url: string, accountName?: (id: string) => string | undefined): Resolved | null {
  const [path, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  const [, first, second] = path.split('/');
  const app = APPS.find((a) => a.id === first);
  if (!app) return null;
  if (app.id === 'accounts' && second)
    return {
      key: `account:${second}`,
      app,
      title: accountName?.(second) ?? 'Account',
      node: <AccountDetail id={second} />,
    };
  return { key: app.id, app, title: app.label, node: app.render(params) };
}

'use client';

import { useState, type FormEvent } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button, ErrorNote, Field } from '@/components/ui';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      await api('/auth/login', 'POST', { email, password });
      window.location.href = '/dashboard';
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* faint ledger rules */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0 39px, #fff 39px 40px), linear-gradient(to right, transparent 0 72px, #e6a94b 72px 73px, transparent 73px)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-400/15 ring-1 ring-blue-400/30">
            <BarChart3 className="size-5 text-blue-400" />
          </span>
          <span className="font-display text-xl">Kwings Accounts</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="font-display text-5xl leading-[1.05] font-light tracking-tight">
            Every rupee, <em className="text-blue-400 italic">accounted</em> for.
          </h2>
          <p className="mt-5 text-slate-400">
            Income, expenses, projects and returns for Kwings Media — in one calm, clear ledger.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">© Kwings Media</p>
      </section>

      <section className="flex items-center justify-center bg-slate-50 px-5 py-12">
        <div className="rise w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-navy-900">
              <BarChart3 className="size-5 text-blue-400" />
            </span>
            <span className="font-display text-xl text-slate-900">Kwings Accounts</span>
          </div>
          <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 mb-8 text-sm text-slate-500">Sign in to continue to your dashboard.</p>
          <form onSubmit={submit} className="space-y-5">
            <ErrorNote message={error} />
            <Field label="Email">
              <input
                className="input"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full py-3">
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

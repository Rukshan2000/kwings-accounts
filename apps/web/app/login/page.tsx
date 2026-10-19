'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button, ErrorNote } from '@/components/ui';
import { Wallpaper } from '@/components/wallpaper';
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
      window.location.href = '/home';
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-5 pt-[12vh] pb-10 text-white">
      <Wallpaper />
      <LockClock />
      <div className="rise mt-12 w-full max-w-sm glass rounded-[2rem] p-7">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="grid size-16 place-items-center rounded-full bg-white/20 ring-1 ring-white/30">
            <BarChart3 className="size-7" />
          </span>
          <h1 className="font-display text-xl font-medium">Kwings Accounts</h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <ErrorNote message={error} />
          <input
            className="input border-white/30 bg-white/80"
            type="email"
            aria-label="Email"
            autoComplete="username"
            placeholder="Email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input border-white/30 bg-white/80"
            type="password"
            aria-label="Password"
            autoComplete="current-password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" loading={loading} className="w-full py-3">
            Unlock
          </Button>
        </form>
      </div>
      <p className="mt-auto pt-10 text-xs text-white/60">© Kwings Media</p>
    </main>
  );
}

function LockClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="h-32" />;
  return (
    <div className="text-center drop-shadow">
      <div className="text-lg font-medium">
        {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
      <div className="font-display text-8xl font-semibold tracking-tight tabular-nums">
        {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LogOut, Trophy, Users, Tag, CalendarDays, Medal } from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/', label: 'Dashboard', icon: Trophy },
  { href: '/tournaments', label: 'Torneios', icon: CalendarDays },
  { href: '/circuits', label: 'Circuitos', icon: Medal },
  { href: '/players', label: 'Jogadores', icon: Users },
  { href: '/categories', label: 'Categorias', icon: Tag },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-400 to-ocean-600 font-bold text-white shadow-lg">
              S8
            </div>
            <div className="font-semibold tracking-tight">
              Beach Tennis <span className="text-ocean-400">Super 8</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = pathname === n.href || pathname?.startsWith(`${n.href}/`);
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {mounted && user ? (
              <>
                <div className="hidden text-right text-xs leading-tight sm:block">
                  <div className="font-medium text-slate-100">{user.name}</div>
                  <div className="text-slate-400">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-ghost"
                  title="Sair"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : mounted ? (
              <Link href="/login" className="btn-primary">
                Entrar
              </Link>
            ) : null}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto border-t border-white/5 px-2 py-2 md:hidden">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname?.startsWith(`${n.href}/`);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

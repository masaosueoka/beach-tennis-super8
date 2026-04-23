'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@beach-tennis.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao entrar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-400 to-ocean-600 text-xl font-bold text-white shadow-lg">
            S8
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Beach Tennis Super 8
            </h1>
            <p className="text-sm text-slate-400">Acesse sua conta</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Entrar
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Dev default: admin@beach-tennis.local / admin123
        </p>
      </div>
    </div>
  );
}

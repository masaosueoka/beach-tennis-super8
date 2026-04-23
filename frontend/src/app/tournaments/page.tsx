'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';
import type { Tournament } from '@/types';
import { CalendarDays, Users, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  OPEN: 'Aberto',
  IN_PROGRESS: 'Ao vivo',
  FINISHED: 'Finalizado',
  CANCELED: 'Cancelado',
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-500/20 text-slate-300',
  OPEN: 'bg-ocean-500/20 text-ocean-300',
  IN_PROGRESS: 'bg-rose-500/20 text-rose-300',
  FINISHED: 'bg-emerald-500/20 text-emerald-300',
  CANCELED: 'bg-zinc-500/20 text-zinc-400',
};

export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    api
      .get<Tournament[]>(`/api/tournaments${qs}`)
      .then(setTournaments)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const canCreate = user?.role === 'ADMIN' || user?.role === 'ORGANIZER';

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Torneios</h1>
          <p className="text-sm text-slate-400">
            Todos os torneios Super 8 ativos e finalizados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input max-w-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {canCreate ? (
            <Link href="/tournaments/new" className="btn-primary">
              <Plus size={16} /> Novo torneio
            </Link>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-36 animate-pulse" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card text-center text-slate-400">
          Nenhum torneio encontrado.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="card transition hover:border-white/20 hover:bg-white/10"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="font-semibold leading-tight">{t.name}</h3>
                <span
                  className={`chip shrink-0 ${STATUS_STYLE[t.status] ?? ''}`}
                >
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
              <div className="space-y-1 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-slate-500" />
                  {t.scheduledAt
                    ? new Date(t.scheduledAt).toLocaleDateString('pt-BR')
                    : 'Sem data agendada'}
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-500" />
                  {t._count?.entries ?? 0} / {t.maxPlayers} jogadores
                </div>
                <div className="text-xs text-slate-400">
                  {t.category?.name} · {t.matchMode}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PlayerCard } from '@/components/PlayerCard';
import { api } from '@/lib/api';
import type { Player, Sponsor, Tournament } from '@/types';
import { useSocket } from '@/hooks/useSocket';
import { Trophy, Zap, Medal, ExternalLink } from 'lucide-react';

export default function DashboardPage() {
  const [topRanking, setTopRanking] = useState<Player[]>([]);
  const [topCircuit, setTopCircuit] = useState<Player[]>([]);
  const [liveTournaments, setLiveTournaments] = useState<Tournament[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [rk, cc, ts, sp] = await Promise.all([
      api.get<Player[]>('/api/rankings/top?limit=5'),
      api.get<Player[]>('/api/rankings/circuit/top?limit=5'),
      api.get<Tournament[]>('/api/tournaments?status=IN_PROGRESS'),
      api.get<Sponsor[]>('/api/sponsors'),
    ]);
    setTopRanking(rk);
    setTopCircuit(cc);
    setLiveTournaments(ts);
    setSponsors(sp);
    setLoading(false);
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  useSocket({
    events: {
      'ranking.updated': () => refresh(),
      'circuit.ranking.updated': () => refresh(),
      'tournament.finished': () => refresh(),
      'standings.updated': () => refresh(),
    },
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400">
          Ranking, circuitos e torneios ao vivo
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Top ranking */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <h2 className="font-semibold">Top 5 — Ranking Geral</h2>
          </div>
          <div className="space-y-2">
            {loading ? (
              <SkeletonRow count={5} />
            ) : topRanking.length === 0 ? (
              <EmptyState text="Nenhum dado de ranking ainda" />
            ) : (
              topRanking.map((p, i) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  compact
                  subtitle={`${p.rankingPoints} pts`}
                  trailing={<Position n={i + 1} />}
                />
              ))
            )}
          </div>
        </div>

        {/* Top circuit */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Medal size={18} className="text-ocean-400" />
            <h2 className="font-semibold">Top 5 — Circuito</h2>
          </div>
          <div className="space-y-2">
            {loading ? (
              <SkeletonRow count={5} />
            ) : topCircuit.length === 0 ? (
              <EmptyState text="Sem pontuação de circuito" />
            ) : (
              topCircuit.map((p, i) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  compact
                  subtitle={`${p.circuitPoints} pts`}
                  trailing={<Position n={i + 1} />}
                />
              ))
            )}
          </div>
        </div>

        {/* Live tournaments */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Zap size={18} className="text-rose-400" />
            <h2 className="font-semibold">Ao vivo</h2>
          </div>
          <div className="space-y-2">
            {loading ? (
              <SkeletonRow count={3} />
            ) : liveTournaments.length === 0 ? (
              <EmptyState text="Nenhum torneio em andamento" />
            ) : (
              liveTournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="block rounded-xl bg-white/5 px-3 py-2 hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{t.name}</div>
                      <div className="text-xs text-slate-400">
                        {t.category?.name} · {t.matchMode}
                      </div>
                    </div>
                    <span className="chip bg-rose-500/20 text-rose-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                      ao vivo
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sponsors */}
      {sponsors.length > 0 ? (
        <div className="mt-6 card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Patrocinadores
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {sponsors.map((s) => (
              <a
                key={s.id}
                href={s.link ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center rounded-xl bg-white/5 p-4 transition hover:bg-white/10"
                title={s.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.logoUrl}
                  alt={s.name}
                  className="max-h-16 object-contain opacity-80 transition group-hover:opacity-100"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function Position({ n }: { n: number }) {
  const color =
    n === 1
      ? 'bg-amber-400/20 text-amber-300'
      : n === 2
        ? 'bg-slate-300/20 text-slate-200'
        : n === 3
          ? 'bg-amber-700/30 text-amber-400'
          : 'bg-white/10 text-slate-300';
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${color}`}
    >
      {n}
    </span>
  );
}

function SkeletonRow({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl bg-white/5 p-2"
        >
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
            <div className="h-2 w-16 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
      <ExternalLink size={18} className="mx-auto mb-2 text-slate-500" />
      {text}
    </div>
  );
}

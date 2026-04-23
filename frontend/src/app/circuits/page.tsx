'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';
import type { Circuit } from '@/types';
import { Medal, MapPin } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Em breve',
  ACTIVE: 'Ativo',
  FINISHED: 'Finalizado',
};

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: 'bg-slate-500/20 text-slate-300',
  ACTIVE: 'bg-emerald-500/20 text-emerald-300',
  FINISHED: 'bg-ocean-500/20 text-ocean-300',
};

export default function CircuitsPage() {
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Circuit[]>('/api/circuits')
      .then(setCircuits)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Circuitos</h1>
            <p className="text-sm text-slate-400">
              Campeonatos multi-etapas com ranking acumulado.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card h-40 animate-pulse" />
            ))}
          </div>
        ) : circuits.length === 0 ? (
          <div className="card py-12 text-center text-sm text-slate-400">
            Nenhum circuito cadastrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {circuits.map((c) => (
              <Link
                key={c.id}
                href={`/circuits/${c.id}`}
                className="card group transition hover:border-ocean-400/50"
              >
                <div className="flex items-start justify-between">
                  <Medal className="text-ocean-300" size={22} />
                  <span className={`chip ${STATUS_STYLE[c.status] ?? ''}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </div>
                <div className="mt-3 font-semibold">{c.name}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {c.category?.name ?? '—'}
                </div>
                {c.stages && c.stages.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin size={12} /> {c.stages.length} etapas
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

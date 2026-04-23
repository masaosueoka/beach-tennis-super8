'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import type { Circuit, CircuitRanking, Stage } from '@/types';
import { Medal, MapPin, Calendar } from 'lucide-react';
import { PlayerCard } from '@/components/PlayerCard';

export default function CircuitDetailPage() {
  const params = useParams<{ id: string }>();
  const circuitId = params.id;

  const [circuit, setCircuit] = useState<Circuit | null>(null);
  const [ranking, setRanking] = useState<CircuitRanking[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([
        api.get<Circuit>(`/api/circuits/${circuitId}`),
        api.get<CircuitRanking[]>(`/api/circuits/${circuitId}/ranking`),
      ]);
      setCircuit(c);
      setRanking(r);
    } finally {
      setLoading(false);
    }
  }, [circuitId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useSocket({
    events: {
      'circuit.ranking.updated': () => void refresh(),
      'stage.finished': () => void refresh(),
    },
    subscribe: { circuit: circuitId },
  });

  if (loading) {
    return (
      <AppShell>
        <div className="card h-64 animate-pulse" />
      </AppShell>
    );
  }
  if (!circuit) {
    return (
      <AppShell>
        <div className="card text-rose-300">Circuito não encontrado.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Medal className="text-ocean-300" size={20} />
                <h1 className="text-2xl font-bold tracking-tight">{circuit.name}</h1>
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {circuit.category?.name}
              </div>
              {circuit.startDate && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar size={12} />
                  {new Date(circuit.startDate).toLocaleDateString('pt-BR')}
                  {circuit.endDate
                    ? ` – ${new Date(circuit.endDate).toLocaleDateString('pt-BR')}`
                    : ''}
                </div>
              )}
            </div>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/images/circuits/${circuit.id}/top5.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Imagem p/ WhatsApp
            </a>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          {/* Ranking */}
          <section className="card">
            <header className="mb-4 flex items-center gap-2">
              <Medal size={18} className="text-ocean-300" />
              <h2 className="text-lg font-semibold">Ranking Acumulado</h2>
            </header>
            {ranking.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-400">
                Nenhuma etapa concluída.
              </div>
            ) : (
              <ul className="space-y-2">
                {ranking.map((r, i) => (
                  <li key={r.playerId}>
                    <PlayerCard
                      player={r.player}
                      subtitle={`#${i + 1} · ${r.stagesPlayed} etapa${
                        r.stagesPlayed === 1 ? '' : 's'
                      }`}
                      trailing={
                        <span className="text-sm font-bold tabular-nums text-sand-300">
                          {r.totalPoints} pts
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Stages */}
          <section className="card">
            <header className="mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-sand-300" />
              <h2 className="text-lg font-semibold">Etapas</h2>
            </header>
            {!circuit.stages || circuit.stages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-400">
                Nenhuma etapa cadastrada.
              </div>
            ) : (
              <ul className="space-y-2">
                {circuit.stages
                  .slice()
                  .sort((a, b) => a.stageNumber - b.stageNumber)
                  .map((s: Stage) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">
                          {s.stageNumber}. {s.name}
                        </div>
                        {s.scheduledAt && (
                          <div className="text-xs text-slate-400">
                            {new Date(s.scheduledAt).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                      {s.finishedAt ? (
                        <span className="chip bg-emerald-500/20 text-emerald-300">
                          Finalizada
                        </span>
                      ) : (
                        <span className="chip bg-slate-500/20 text-slate-300">
                          Pendente
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

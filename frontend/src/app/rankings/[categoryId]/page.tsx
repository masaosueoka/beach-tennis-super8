'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PlayerCard } from '@/components/PlayerCard';
import { api, API_BASE } from '@/lib/api';
import type { Category, RankingEntry } from '@/types';
import { Image as ImageIcon } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';

export default function CategoryRankingPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [cat, rk] = await Promise.all([
      api.get<Category>(`/api/categories/${categoryId}`),
      api.get<RankingEntry[]>(`/api/rankings/category/${categoryId}`),
    ]);
    setCategory(cat);
    setRanking(rk);
    setLoading(false);
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  useSocket({
    events: { 'ranking.updated': () => refresh() },
    subscribe: { category: categoryId },
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ranking {category?.name ?? ''}
          </h1>
          <p className="text-sm text-slate-400">
            Acumulado de todas as edições finalizadas
          </p>
        </div>
        <a
          href={`${API_BASE}/images/categories/${categoryId}/top5.png`}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost"
        >
          <ImageIcon size={16} /> PNG WhatsApp
        </a>
      </div>

      {loading ? (
        <div className="card h-60 animate-pulse" />
      ) : ranking.length === 0 ? (
        <div className="card text-center text-slate-400">
          Ninguém pontuou nesta categoria ainda.
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="w-12 p-3 text-left">#</th>
                <th className="p-3 text-left">Jogador</th>
                <th className="hidden p-3 text-right md:table-cell">Torneios</th>
                <th className="hidden p-3 text-right md:table-cell">V-D</th>
                <th className="p-3 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.playerId} className="border-t border-white/5">
                  <td className="p-3 font-semibold text-slate-400">{i + 1}</td>
                  <td className="p-3">
                    <PlayerCard player={r.player} compact />
                  </td>
                  <td className="hidden p-3 text-right text-slate-400 md:table-cell">
                    {r.tournamentsPlayed}
                  </td>
                  <td className="hidden p-3 text-right text-slate-400 md:table-cell">
                    {r.wins}-{r.losses}
                  </td>
                  <td className="p-3 text-right font-mono">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PlayerAvatar } from '@/components/PlayerCard';
import { ScoreInput } from '@/components/ScoreInput';
import { api, API_BASE } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/lib/auth';
import type { Match, Player, Tournament } from '@/types';
import { Play, Trophy, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const [t, setT] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api.get<Tournament>(`/api/tournaments/${id}`);
    setT(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useSocket({
    events: {
      'standings.updated': () => refresh(),
      'match.finished': () => refresh(),
      'tournament.finished': () => refresh(),
    },
    subscribe: { tournament: id },
  });

  async function handleStart() {
    setStarting(true);
    try {
      await api.post(`/api/tournaments/${id}/start`);
      await refresh();
    } finally {
      setStarting(false);
    }
  }

  if (loading || !t) {
    return (
      <AppShell>
        <div className="card h-48 animate-pulse" />
      </AppShell>
    );
  }

  const canScore =
    user?.role === 'ADMIN' ||
    user?.role === 'ORGANIZER' ||
    user?.role === 'REFEREE';
  const canStart =
    (user?.role === 'ADMIN' || user?.role === 'ORGANIZER') &&
    t.status === 'OPEN' &&
    (t.entries?.length ?? 0) >= 3;

  const playerMap = new Map<string, Player>();
  t.entries?.forEach((e) => playerMap.set(e.playerId, e.player));

  // Group matches by round
  const matchesByRound = new Map<number, Match[]>();
  t.matches?.forEach((m) => {
    const list = matchesByRound.get(m.roundNumber) ?? [];
    list.push(m);
    matchesByRound.set(m.roundNumber, list);
  });
  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>{t.category?.name}</span>
            <span>·</span>
            <span>{t.matchMode}</span>
            <span className="chip ml-2">{t.status}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {t.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {t.status === 'FINISHED' ? (
            <a
              href={`${API_BASE}/images/tournaments/${id}/standings.png`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              <ImageIcon size={16} /> PNG WhatsApp
            </a>
          ) : null}
          {canStart ? (
            <button
              onClick={handleStart}
              disabled={starting}
              className="btn-primary"
            >
              {starting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              Iniciar torneio
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Standings */}
        <div className="card lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Trophy size={16} className="text-amber-400" />
            Classificação
          </h2>
          {(t.standings?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-400">
              A classificação aparece após a primeira partida.
            </div>
          ) : (
            <div className="space-y-1">
              {t.standings
                ?.slice()
                .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
                .map((s) => (
                  <div
                    key={s.playerId}
                    className="flex items-center gap-3 rounded-xl bg-white/5 p-2"
                  >
                    <div className="w-6 text-center text-sm font-semibold text-slate-400">
                      {s.position ?? '—'}
                    </div>
                    <PlayerAvatar
                      name={s.player?.name ?? '?'}
                      photoUrl={s.player?.photoUrl}
                      size={28}
                    />
                    <div className="min-w-0 flex-1 truncate text-sm">
                      {s.player?.name}
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div className="font-mono text-sm text-slate-100">
                        {s.points} pts
                      </div>
                      <div>
                        {s.wins}V-{s.losses}D · SD{' '}
                        {s.setDifference >= 0 ? '+' : ''}
                        {s.setDifference}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Rounds */}
        <div className="card lg:col-span-2">
          <h2 className="mb-4 font-semibold">Partidas</h2>
          {rounds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-400">
              As partidas serão geradas ao iniciar o torneio.
            </div>
          ) : (
            <div className="space-y-6">
              {rounds.map((r) => (
                <div key={r}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Rodada {r}
                  </div>
                  <div className="space-y-2">
                    {matchesByRound.get(r)!.map((m) => (
                      <MatchRow
                        key={m.id}
                        match={m}
                        playerA={playerMap.get(m.playerAId)}
                        playerB={playerMap.get(m.playerBId)}
                        canScore={canScore && t.status === 'IN_PROGRESS'}
                        isScoring={scoringMatchId === m.id}
                        onToggleScoring={() =>
                          setScoringMatchId((prev) => (prev === m.id ? null : m.id))
                        }
                        mode={t.matchMode}
                        onSubmitted={() => {
                          setScoringMatchId(null);
                          refresh();
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function MatchRow({
  match,
  playerA,
  playerB,
  canScore,
  isScoring,
  onToggleScoring,
  mode,
  onSubmitted,
}: {
  match: Match;
  playerA: Player | undefined;
  playerB: Player | undefined;
  canScore: boolean;
  isScoring: boolean;
  onToggleScoring: () => void;
  mode: Tournament['matchMode'];
  onSubmitted: () => void;
}) {
  const finished = match.status === 'FINISHED';
  const winnerA = finished && match.winnerId === match.playerAId;
  const winnerB = finished && match.winnerId === match.playerBId;

  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Side
            name={playerA?.name ?? '—'}
            photoUrl={playerA?.photoUrl}
            isWinner={winnerA}
            score={finished ? match.setsWonA : null}
          />
          <Side
            name={playerB?.name ?? '—'}
            photoUrl={playerB?.photoUrl}
            isWinner={winnerB}
            score={finished ? match.setsWonB : null}
          />
        </div>
        {finished ? (
          <div className="text-right text-xs text-slate-400">
            <div className="text-slate-300">Finalizada</div>
            <div>
              Games: {match.gamesWonA}-{match.gamesWonB}
            </div>
          </div>
        ) : canScore ? (
          <button onClick={onToggleScoring} className="btn-ghost text-xs">
            {isScoring ? 'Fechar' : 'Lançar'}
          </button>
        ) : (
          <span className="text-xs text-slate-500">Aguardando</span>
        )}
      </div>

      {isScoring && canScore && !finished ? (
        <div className="mt-3 border-t border-white/10 pt-3">
          <ScoreInput
            match={match}
            mode={mode}
            playerA={playerA}
            playerB={playerB}
            onSubmitted={onSubmitted}
          />
        </div>
      ) : null}
    </div>
  );
}

function Side({
  name,
  photoUrl,
  isWinner,
  score,
}: {
  name: string;
  photoUrl?: string | null;
  isWinner: boolean;
  score: number | null;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        isWinner ? 'font-semibold text-emerald-300' : ''
      }`}
    >
      <PlayerAvatar name={name} photoUrl={photoUrl} size={24} />
      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
      {score !== null ? (
        <span className="font-mono text-lg">{score}</span>
      ) : null}
    </div>
  );
}

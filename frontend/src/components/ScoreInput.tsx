'use client';

import { useState } from 'react';
import type { Match, MatchMode, SetScore, Player } from '@/types';
import { api, ApiError } from '@/lib/api';
import { Loader2, Check } from 'lucide-react';

interface Props {
  match: Match;
  mode: MatchMode;
  playerA: Player | undefined;
  playerB: Player | undefined;
  onSubmitted: () => void;
}

export function ScoreInput({ match, mode, playerA, playerB, onSubmitted }: Props) {
  const [sets, setSets] = useState<SetScore[]>(
    mode === 'STANDARD'
      ? [
          { a: 0, b: 0 },
          { a: 0, b: 0 },
        ]
      : [
          { a: 0, b: 0 },
          { a: 0, b: 0 },
        ],
  );
  const [showThird, setShowThird] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSet(i: number, patch: Partial<SetScore>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function submit() {
    setError(null);
    setSaving(true);

    // Filter out empty/default sets (both 0-0 and no tiebreak flag) from the payload
    const payload = sets.filter((s) => !(s.a === 0 && s.b === 0));

    // Add the third set if it's been opened and filled in
    if (showThird && sets[2] && !(sets[2].a === 0 && sets[2].b === 0)) {
      // already included above
    } else if (!showThird && payload.length === 3) {
      // Shouldn't happen, but be defensive
      payload.length = 2;
    }

    try {
      await api.post(`/api/tournaments/matches/${match.id}/result`, {
        sets: payload,
      });
      onSubmitted();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao salvar resultado';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="truncate font-medium">
            {playerA?.name ?? 'Jogador A'}
          </span>
          <span className="text-slate-400">vs</span>
          <span className="truncate text-right font-medium">
            {playerB?.name ?? 'Jogador B'}
          </span>
        </div>

        {sets.slice(0, showThird ? 3 : 2).map((set, i) => {
          const isSuperTb = mode === 'PRO' && i === 2;
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3"
            >
              <div className="shrink-0 text-xs uppercase tracking-wide text-slate-400">
                {isSuperTb ? 'Super TB' : `Set ${i + 1}`}
              </div>
              <div className="flex items-center gap-2">
                <NumberInput
                  value={set.a}
                  onChange={(a) => updateSet(i, { a })}
                />
                <span className="text-slate-500">×</span>
                <NumberInput
                  value={set.b}
                  onChange={(b) => updateSet(i, { b })}
                />
                {mode === 'STANDARD' && !isSuperTb ? (
                  <label className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={!!set.tiebreak}
                      onChange={(e) => updateSet(i, { tiebreak: e.target.checked })}
                      className="h-3.5 w-3.5 rounded"
                    />
                    TB
                  </label>
                ) : null}
              </div>
            </div>
          );
        })}

        {!showThird ? (
          <button
            type="button"
            onClick={() => {
              setShowThird(true);
              setSets((prev) => [...prev.slice(0, 2), { a: 0, b: 0 }]);
            }}
            className="btn-ghost w-full text-xs"
          >
            + Adicionar terceiro set / Super TB
          </button>
        ) : null}
      </div>

      <button
        onClick={submit}
        disabled={saving}
        className="btn-primary w-full"
      >
        {saving ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Check size={14} />
        )}
        Salvar resultado
      </button>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      className="w-14 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center font-mono text-lg focus:border-ocean-400 focus:outline-none"
    />
  );
}

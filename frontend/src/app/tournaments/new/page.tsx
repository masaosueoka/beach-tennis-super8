'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { Category, Player, Tournament } from '@/types';
import { Loader2, Plus, X } from 'lucide-react';

export default function NewTournamentPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [matchMode, setMatchMode] = useState<'STANDARD' | 'PRO'>('STANDARD');
  const [scheduledAt, setScheduledAt] = useState('');
  const [registrationFee, setRegistrationFee] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Category[]>('/api/categories').then(setCategories);
    api.get<Player[]>('/api/players?active=true').then(setAllPlayers);
  }, []);

  useEffect(() => {
    if (categoryId) {
      api
        .get<Player[]>(`/api/players?active=true&categoryId=${categoryId}`)
        .then(setAllPlayers);
    }
  }, [categoryId]);

  function togglePlayer(id: string) {
    setSelectedPlayers((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= 8
          ? prev
          : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        categoryId,
        matchMode,
      };
      if (scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }
      if (registrationFee) {
        payload.registrationFee = parseFloat(registrationFee);
      }
      const created = await api.post<Tournament>('/api/tournaments', payload);

      if (selectedPlayers.length >= 3) {
        await api.post(`/api/tournaments/${created.id}/players`, {
          playerIds: selectedPlayers,
        });
      }
      router.push(`/tournaments/${created.id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao criar torneio';
      setError(msg);
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Novo torneio</h1>
        <p className="text-sm text-slate-400">
          Configure os dados e selecione entre 3 e 8 jogadores.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="space-y-4">
            <div>
              <label className="label">Nome</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="label">Categoria</label>
              <select
                className="input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">Selecione…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Modalidade</label>
              <select
                className="input"
                value={matchMode}
                onChange={(e) => setMatchMode(e.target.value as 'STANDARD' | 'PRO')}
              >
                <option value="STANDARD">Standard (6 games / set)</option>
                <option value="PRO">PRO (2 sets + Super Tie-break)</option>
              </select>
            </div>
            <div>
              <label className="label">Data agendada</label>
              <input
                type="datetime-local"
                className="input"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Taxa de inscrição (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(e.target.value)}
              />
            </div>
            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={saving || !name || !categoryId}
              className="btn-primary w-full"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Criar torneio
            </button>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">
              Jogadores ({selectedPlayers.length}/8)
            </h2>
            {selectedPlayers.length < 3 ? (
              <span className="text-xs text-amber-400">
                Selecione pelo menos 3 jogadores
              </span>
            ) : null}
          </div>
          {allPlayers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-400">
              Nenhum jogador cadastrado nesta categoria.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {allPlayers.map((p) => {
                const checked = selectedPlayers.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${
                      checked
                        ? 'border-ocean-400 bg-ocean-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="truncate text-sm font-medium">
                      {p.name}
                    </span>
                    {checked ? (
                      <span className="chip bg-ocean-500/20 text-ocean-300">
                        #{selectedPlayers.indexOf(p.id) + 1}
                      </span>
                    ) : (
                      <Plus size={14} className="text-slate-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedPlayers.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {selectedPlayers.map((id) => {
                const p = allPlayers.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <span
                    key={id}
                    className="chip bg-white/10"
                  >
                    {p.name}
                    <button
                      type="button"
                      onClick={() => togglePlayer(id)}
                      className="ml-1 text-slate-400 hover:text-rose-300"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </form>
    </AppShell>
  );
}

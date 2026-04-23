'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PlayerCard } from '@/components/PlayerCard';
import { api, ApiError } from '@/lib/api';
import type { Category, Player } from '@/types';
import { useAuth } from '@/lib/auth';
import { Plus, Loader2, X } from 'lucide-react';

export default function PlayersPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ORGANIZER';
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    api
      .get<Player[]>(`/api/players${qs}`)
      .then(setPlayers)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    api.get<Category[]>('/api/categories').then(setCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jogadores</h1>
          <p className="text-sm text-slate-400">
            {players.length} cadastrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input max-w-xs"
            placeholder="Buscar por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {canEdit ? (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="btn-primary"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? 'Fechar' : 'Novo'}
            </button>
          ) : null}
        </div>
      </div>

      {showForm && canEdit ? (
        <div className="mb-6">
          <NewPlayerForm
            categories={categories}
            onCreated={() => {
              setShowForm(false);
              refresh();
            }}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="card text-center text-slate-400">
          Nenhum jogador encontrado.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => (
            <div key={p.id} className="card">
              <PlayerCard
                player={p}
                subtitle={
                  <>
                    {p.rankingPoints} pts ·{' '}
                    {p.categories?.map((c) => c.category.name).join(', ') ||
                      'sem categoria'}
                  </>
                }
                trailing={
                  p.circuitPoints > 0 ? (
                    <span className="chip bg-ocean-500/20 text-ocean-300">
                      {p.circuitPoints} circ.
                    </span>
                  ) : undefined
                }
              />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function NewPlayerForm({
  categories,
  onCreated,
}: {
  categories: Category[];
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/api/players', {
        name,
        email: email || undefined,
        whatsapp: whatsapp || undefined,
        categoryIds,
      });
      setName('');
      setEmail('');
      setWhatsapp('');
      setCategoryIds([]);
      onCreated();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao cadastrar';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-3 md:grid-cols-4">
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
        <label className="label">E-mail</label>
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="label">WhatsApp</label>
        <input
          className="input"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Categorias</label>
        <select
          multiple
          className="input h-[42px]"
          value={categoryIds}
          onChange={(e) =>
            setCategoryIds(
              Array.from(e.target.selectedOptions).map((o) => o.value),
            )
          }
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <div className="md:col-span-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      <div className="md:col-span-4">
        <button className="btn-primary" disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Cadastrar jogador
        </button>
      </div>
    </form>
  );
}

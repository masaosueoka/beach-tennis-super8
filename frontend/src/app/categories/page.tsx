'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { api, ApiError, API_BASE } from '@/lib/api';
import type { Category } from '@/types';
import { useAuth } from '@/lib/auth';
import { Plus, Image as ImageIcon, Tag } from 'lucide-react';

export default function CategoriesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ORGANIZER';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  function refresh() {
    setLoading(true);
    api
      .get<Category[]>('/api/categories')
      .then(setCategories)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-sm text-slate-400">
            {categories.length} categorias
          </p>
        </div>
        {canEdit ? (
          <button
            className="btn-primary"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={16} /> Nova
          </button>
        ) : null}
      </div>

      {showForm && canEdit ? (
        <div className="mb-6">
          <NewCategoryForm
            onCreated={() => {
              setShowForm(false);
              refresh();
            }}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="card">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-ocean-400" />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {c.type}
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-semibold">{c.name}</h3>
                </div>
              </div>
              {c.description ? (
                <p className="mb-3 text-sm text-slate-400">{c.description}</p>
              ) : null}
              <div className="flex gap-2">
                <Link
                  href={`/rankings/${c.id}`}
                  className="btn-ghost flex-1 text-xs"
                >
                  Ver ranking
                </Link>
                <a
                  href={`${API_BASE}/images/categories/${c.id}/top5.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost text-xs"
                  title="PNG para WhatsApp"
                >
                  <ImageIcon size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function NewCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Category['type']>('MIXED');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/api/categories', {
        name,
        type,
        description: description || undefined,
      });
      setName('');
      setDescription('');
      onCreated();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao criar categoria';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-3 md:grid-cols-3">
      <div>
        <label className="label">Nome</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Tipo</label>
        <select
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value as Category['type'])}
        >
          <option value="MALE">Masculino</option>
          <option value="FEMALE">Feminino</option>
          <option value="MIXED">Misto</option>
          <option value="OPEN">Open</option>
        </select>
      </div>
      <div>
        <label className="label">Descrição</label>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error ? (
        <div className="md:col-span-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      <div className="md:col-span-3">
        <button className="btn-primary" disabled={saving}>
          <Plus size={14} /> Criar categoria
        </button>
      </div>
    </form>
  );
}

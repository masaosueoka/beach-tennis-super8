'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setToken } from './api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      async login(email, password) {
        const res = await api.post<{ token: string; user: User }>('/api/auth/login', {
          email,
          password,
        });
        setToken(res.token);
        set({ token: res.token, user: res.user });
      },
      logout() {
        setToken(null);
        set({ token: null, user: null });
      },
      hydrate() {
        // zustand persist handles this automatically; placeholder for future
        // server-side syncing logic.
      },
    }),
    {
      name: 'beach-tennis-auth',
      // After rehydration, make sure the api client also sees the token.
      onRehydrateStorage: () => (state) => {
        if (state?.token) setToken(state.token);
      },
    },
  ),
);

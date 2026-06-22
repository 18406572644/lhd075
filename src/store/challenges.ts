import { create } from 'zustand';
import type { Challenge } from '@shared/types';
import api from '@/lib/api';

interface ChallengeState {
  challenges: Challenge[];
  current: Challenge | null;
  loading: boolean;
  error: string | null;
  fetchAll: (userId?: string) => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  create: (payload: Record<string, unknown>) => Promise<{ success: boolean; data?: Challenge; error?: string }>;
  join: (id: string, memberId: string) => Promise<boolean>;
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  challenges: [],
  current: null,
  loading: false,
  error: null,
  fetchAll: async (userId) => {
    set({ loading: true });
    const res = await api.challenges.getAll(userId);
    if (res.success) set({ challenges: res.data || [] });
    set({ loading: false });
  },
  fetchById: async (id) => {
    set({ loading: true });
    const res = await api.challenges.getById(id);
    if (res.success) set({ current: res.data || null });
    set({ loading: false });
  },
  create: async (payload) => {
    const res = await api.challenges.create(payload);
    if (res.success) {
      set((s) => ({ challenges: [res.data!, ...s.challenges] }));
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error?.message };
  },
  join: async (id, memberId) => {
    const res = await api.challenges.join(id, memberId);
    if (res.success) {
      await get().fetchAll(memberId);
      return true;
    }
    return false;
  },
}));

export default useChallengeStore;

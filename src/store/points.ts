import { create } from 'zustand';
import type { UserPoints, PointsRecord, MallItem, UserMallItem } from '@shared/types';
import api from '@/lib/api';

interface PointsState {
  userPoints: UserPoints | null;
  pointsRecords: PointsRecord[];
  mallItems: MallItem[];
  userMallItems: UserMallItem[];
  loading: {
    points: boolean;
    records: boolean;
    mall: boolean;
    userItems: boolean;
  };
  lastUpdate: number;
  refreshUserPoints: (memberId: string, force?: boolean) => Promise<void>;
  refreshRecords: (memberId: string, force?: boolean) => Promise<void>;
  refreshMallItems: (params?: { type?: string; isActive?: boolean }, force?: boolean) => Promise<void>;
  refreshUserMallItems: (memberId: string, force?: boolean) => Promise<void>;
  refreshAll: (memberId: string) => Promise<void>;
  clearAll: () => void;
  invalidateCache: () => void;
}

const CACHE_TTL = 30_000;

export const usePointsStore = create<PointsState>((set, get) => ({
  userPoints: null,
  pointsRecords: [],
  mallItems: [],
  userMallItems: [],
  loading: {
    points: false,
    records: false,
    mall: false,
    userItems: false,
  },
  lastUpdate: 0,

  refreshUserPoints: async (memberId: string, force = false) => {
    const state = get();
    if (!force && state.loading.points) return;
    if (!force && state.userPoints && Date.now() - state.lastUpdate < CACHE_TTL) return;

    set({ loading: { ...state.loading, points: true } });
    try {
      const res = await api.points.getUserPoints(memberId);
      if (res.success) {
        set({
          userPoints: res.data || null,
          lastUpdate: Date.now(),
        });
      }
    } finally {
      set({ loading: { ...get().loading, points: false } });
    }
  },

  refreshRecords: async (memberId: string, force = false) => {
    const state = get();
    if (!force && state.loading.records) return;

    set({ loading: { ...state.loading, records: true } });
    try {
      const res = await api.points.getRecords({ memberId, limit: 100 });
      if (res.success) {
        set({ pointsRecords: res.data || [] });
      }
    } finally {
      set({ loading: { ...get().loading, records: false } });
    }
  },

  refreshMallItems: async (params = {}, force = false) => {
    const state = get();
    if (!force && state.loading.mall) return;

    set({ loading: { ...state.loading, mall: true } });
    try {
      const res = await api.mall.getItems({
        isActive: true,
        ...(params.type ? { type: params.type as any } : {}),
      });
      if (res.success) {
        set({ mallItems: res.data || [] });
      }
    } finally {
      set({ loading: { ...get().loading, mall: false } });
    }
  },

  refreshUserMallItems: async (memberId: string, force = false) => {
    const state = get();
    if (!force && state.loading.userItems) return;

    set({ loading: { ...state.loading, userItems: true } });
    try {
      const res = await api.mall.getUserItems(memberId);
      if (res.success) {
        set({ userMallItems: res.data || [] });
      }
    } finally {
      set({ loading: { ...get().loading, userItems: false } });
    }
  },

  refreshAll: async (memberId: string) => {
    await Promise.all([
      get().refreshUserPoints(memberId, true),
      get().refreshRecords(memberId, true),
      get().refreshMallItems(undefined, true),
      get().refreshUserMallItems(memberId, true),
    ]);
  },

  clearAll: () => {
    set({
      userPoints: null,
      pointsRecords: [],
      mallItems: [],
      userMallItems: [],
      lastUpdate: 0,
    });
  },

  invalidateCache: () => {
    set({ lastUpdate: 0 });
  },
}));

export default usePointsStore;

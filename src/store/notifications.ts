import { create } from 'zustand';
import type { Notification, NotificationType, NotificationSettings } from '@shared/types';
import api from '@/lib/api';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  settings: NotificationSettings | null;
  loading: {
    list: boolean;
    unread: boolean;
    settings: boolean;
  };
  activeTab: NotificationType | 'all';
  refreshNotifications: (memberId: string, force?: boolean) => Promise<void>;
  refreshUnreadCount: (memberId: string, force?: boolean) => Promise<void>;
  refreshSettings: (memberId: string, force?: boolean) => Promise<void>;
  markAsRead: (notificationId: string, memberId: string) => Promise<void>;
  markAllAsRead: (memberId: string) => Promise<void>;
  deleteNotification: (notificationId: string, memberId: string) => Promise<void>;
  updateSettings: (memberId: string, updates: Partial<Omit<NotificationSettings, 'memberId' | 'updatedAt'>>) => Promise<void>;
  setActiveTab: (tab: NotificationType | 'all') => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  totalCount: 0,
  settings: null,
  loading: {
    list: false,
    unread: false,
    settings: false,
  },
  activeTab: 'all',

  refreshNotifications: async (memberId: string, force = false) => {
    const state = get();
    if (!force && state.loading.list) return;

    set({ loading: { ...state.loading, list: true } });
    try {
      const activeTab = state.activeTab;
      const params = activeTab !== 'all' ? { type: activeTab } : undefined;
      const res = await api.notifications.getList(memberId, params);
      if (res.success && res.data) {
        set({
          notifications: res.data.notifications,
          unreadCount: res.data.unreadCount,
          totalCount: res.data.totalCount,
        });
      }
    } finally {
      set({ loading: { ...get().loading, list: false } });
    }
  },

  refreshUnreadCount: async (memberId: string, force = false) => {
    const state = get();
    if (!force && state.loading.unread) return;

    set({ loading: { ...state.loading, unread: true } });
    try {
      const res = await api.notifications.getUnreadCount(memberId);
      if (res.success && res.data) {
        set({ unreadCount: res.data.count });
      }
    } finally {
      set({ loading: { ...get().loading, unread: false } });
    }
  },

  refreshSettings: async (memberId: string, force = false) => {
    const state = get();
    if (!force && state.loading.settings) return;

    set({ loading: { ...state.loading, settings: true } });
    try {
      const res = await api.notifications.getSettings(memberId);
      if (res.success && res.data) {
        set({ settings: res.data });
      }
    } finally {
      set({ loading: { ...get().loading, settings: false } });
    }
  },

  markAsRead: async (notificationId: string, memberId: string) => {
    const res = await api.notifications.markAsRead(notificationId, memberId);
    if (res.success) {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    }
  },

  markAllAsRead: async (memberId: string) => {
    const res = await api.notifications.markAllAsRead(memberId);
    if (res.success) {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    }
  },

  deleteNotification: async (notificationId: string, memberId: string) => {
    const res = await api.notifications.delete(notificationId, memberId);
    if (res.success) {
      set((state) => {
        const deleted = state.notifications.find((n) => n.id === notificationId);
        return {
          notifications: state.notifications.filter((n) => n.id !== notificationId),
          unreadCount: deleted && !deleted.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          totalCount: Math.max(0, state.totalCount - 1),
        };
      });
    }
  },

  updateSettings: async (memberId: string, updates: Partial<Omit<NotificationSettings, 'memberId' | 'updatedAt'>>) => {
    const res = await api.notifications.updateSettings(memberId, updates);
    if (res.success && res.data) {
      set({ settings: res.data });
    }
  },

  setActiveTab: (tab: NotificationType | 'all') => {
    set({ activeTab: tab });
  },

  clearAll: () => {
    set({
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
      settings: null,
    });
  },
}));

export default useNotificationsStore;

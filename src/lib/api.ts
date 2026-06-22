import type {
  User,
  Challenge,
  Checkin,
  RankingItem,
  CertificateData,
  DashboardStats,
  ChallengeStatistics,
  ApiResponse,
  CreateCheckinInput,
  PersonalAnalytics,
  TeamAnalytics,
  AdminChallengeComparison,
  DeepAnalyticsData,
  ReportPeriod,
  UserPoints,
  PointsRecord,
  MallItem,
  UserMallItem,
  PointsActionType,
  MallItemType,
  CheckInWithPointsResponse,
  Notification,
  NotificationType,
  NotificationSettings,
  NotificationListResponse,
  PersonalAchievements,
  Gender,
} from '@shared/types';

const BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  const res = await fetch(BASE + url, { ...options, headers });
  const data = (await res.json()) as ApiResponse<T>;
  return data;
}

export const api = {
  auth: {
    login: (username: string, password: string, joinCode?: string) =>
      request<{ user: Omit<User, 'password'>; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, joinCode }),
      }),
    getUsers: () => request<Omit<User, 'password'>[]>('/auth/users'),
    getUser: (id: string) => request<Omit<User, 'password'>>(`/auth/users/${id}`),
  },

  challenges: {
    getAll: (userId?: string) =>
      request<Challenge[]>(`/challenges${userId ? `?userId=${userId}` : ''}`),
    getById: (id: string) => request<Challenge>(`/challenges/${id}`),
    create: (payload: Record<string, unknown>) =>
      request<Challenge>('/challenges', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<Challenge>(`/challenges/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    join: (id: string, memberId: string) =>
      request<Challenge>(`/challenges/${id}/join`, {
        method: 'POST',
        body: JSON.stringify({ memberId }),
      }),
  },

  checkins: {
    getAll: (params?: Partial<{ challengeId: string; memberId: string; dateFrom: string; dateTo: string }>) => {
      const qs = params
        ? '?' +
          Object.entries(params)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}=${v}`)
            .join('&')
        : '';
      return request<Checkin[]>(`/checkins${qs}`);
    },
    create: (payload: CreateCheckinInput) =>
      request<Checkin | CheckInWithPointsResponse>('/checkins', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  points: {
    getUserPoints: (memberId: string) => request<UserPoints>(`/points/user/${memberId}`),
    getRecords: (params?: Partial<{ memberId: string; actionType: PointsActionType; dateFrom: string; dateTo: string; limit: number }>) => {
      const qs = params
        ? '?' +
          Object.entries(params)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}=${v}`)
            .join('&')
        : '';
      return request<PointsRecord[]>(`/points/records${qs}`);
    },
    getRanking: (limit?: number) =>
      request<{ memberId: string; memberName: string; avatar?: string; totalPoints: number; currentPoints: number; consecutiveDays: number; rank: number }[]>(
        `/points/ranking${limit ? `?limit=${limit}` : ''}`,
      ),
    awardPostDynamic: (memberId: string, dynamicId: string) =>
      request<PointsRecord>('/points/dynamic', {
        method: 'POST',
        body: JSON.stringify({ memberId, dynamicId }),
      }),
    awardInvite: (inviterId: string, invitedMemberId: string) =>
      request<PointsRecord>('/points/invite', {
        method: 'POST',
        body: JSON.stringify({ inviterId, invitedMemberId }),
      }),
    awardBonus: (memberId: string, points: number, description: string, relatedId?: string) =>
      request<PointsRecord>('/points/bonus', {
        method: 'POST',
        body: JSON.stringify({ memberId, points, description, relatedId }),
      }),
  },

  mall: {
    getItems: (params?: Partial<{ type: MallItemType; isActive: boolean }>) => {
      const qs = params
        ? '?' +
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${v}`)
            .join('&')
        : '';
      return request<MallItem[]>(`/mall/items${qs}`);
    },
    getItem: (id: string) => request<MallItem>(`/mall/items/${id}`),
    getUserItems: (memberId: string, params?: Partial<{ type: MallItemType; used: boolean }>) => {
      const qs = params
        ? '?' +
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${v}`)
            .join('&')
        : '';
      return request<UserMallItem[]>(`/mall/user/${memberId}${qs}`);
    },
    exchange: (mallItemId: string, memberId: string) =>
      request<UserMallItem>('/mall/exchange', {
        method: 'POST',
        body: JSON.stringify({ mallItemId, memberId }),
      }),
    useItem: (userMallItemId: string, memberId: string) =>
      request<UserMallItem>(`/mall/items/${userMallItemId}/use`, {
        method: 'POST',
        body: JSON.stringify({ memberId }),
      }),
    addItem: (payload: Omit<MallItem, 'id' | 'createdAt'>) =>
      request<MallItem>('/mall/items', { method: 'POST', body: JSON.stringify(payload) }),
    updateItem: (id: string, payload: Partial<Omit<MallItem, 'id' | 'createdAt'>>) =>
      request<MallItem>(`/mall/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteItem: (id: string) =>
      request<boolean>(`/mall/items/${id}`, { method: 'DELETE' }),
  },

  ranking: {
    getChallengeRanking: (id: string, sortBy: 'consecutive' | 'duration' | 'checkins' | 'rate' = 'consecutive') =>
      request<RankingItem[]>(`/ranking/challenge/${id}?sortBy=${sortBy}`),
  },

  analytics: {
    getDashboard: (userId?: string, userRole?: 'admin' | 'member') => {
      const qs = userId && userRole ? `?userId=${userId}&userRole=${userRole}` : '';
      return request<DashboardStats>(`/analytics/dashboard${qs}`);
    },
    getChallengeStatistics: (id: string) =>
      request<ChallengeStatistics>(`/analytics/challenge/${id}`),
    getPersonalAnalytics: (memberId: string) =>
      request<PersonalAnalytics>(`/analytics/personal/${memberId}`),
    getTeamAnalytics: (challengeId?: string) => {
      const qs = challengeId ? `?challengeId=${challengeId}` : '';
      return request<TeamAnalytics>(`/analytics/team${qs}`);
    },
    getAdminComparison: () =>
      request<AdminChallengeComparison[]>('/analytics/admin/comparison'),
    getDeepAnalytics: (memberId?: string, userRole?: 'admin' | 'member', challengeId?: string) => {
      const params = new URLSearchParams();
      if (memberId) params.set('memberId', memberId);
      if (userRole) params.set('userRole', userRole);
      if (challengeId) params.set('challengeId', challengeId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return request<DeepAnalyticsData>(`/analytics/deep${qs}`);
    },
    getReportData: (period: ReportPeriod, memberId?: string, userRole?: 'admin' | 'member', challengeId?: string) => {
      const params = new URLSearchParams();
      params.set('period', period);
      if (memberId) params.set('memberId', memberId);
      if (userRole) params.set('userRole', userRole);
      if (challengeId) params.set('challengeId', challengeId);
      return request<{ period: ReportPeriod; analytics: DeepAnalyticsData }>(`/analytics/report?${params.toString()}`);
    },
  },

  certificates: {
    getOrCreate: (challengeId: string, memberId: string) =>
      request<CertificateData>(`/certificates/${challengeId}/${memberId}`),
    getByMember: (memberId: string) =>
      request<CertificateData[]>(`/certificates/member/${memberId}`),
  },

  notifications: {
    getList: (memberId: string, params?: Partial<{ type: NotificationType; read: boolean; limit: number; offset: number }>) => {
      const qs = params
        ? '?' +
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${v}`)
            .join('&')
        : '';
      return request<NotificationListResponse>(`/notifications/user/${memberId}${qs}`);
    },
    getUnreadCount: (memberId: string) =>
      request<{ count: number }>(`/notifications/user/${memberId}/unread-count`),
    markAsRead: (notificationId: string, memberId: string) =>
      request<Notification>(`/notifications/${notificationId}/read`, {
        method: 'POST',
        body: JSON.stringify({ memberId }),
      }),
    markAllAsRead: (memberId: string) =>
      request<{ count: number }>(`/notifications/user/${memberId}/read-all`, {
        method: 'POST',
      }),
    delete: (notificationId: string, memberId: string) =>
      request<{ success: boolean }>(`/notifications/${notificationId}`, {
        method: 'DELETE',
        body: JSON.stringify({ memberId }),
      }),
    create: (payload: { memberId: string; type: NotificationType; title: string; content: string; relatedId?: string; relatedType?: string }) =>
      request<Notification>('/notifications', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getSettings: (memberId: string) =>
      request<NotificationSettings>(`/notifications/settings/${memberId}`),
    updateSettings: (memberId: string, updates: Partial<Omit<NotificationSettings, 'memberId' | 'updatedAt'>>) =>
      request<NotificationSettings>(`/notifications/settings/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
  },

  profile: {
    updateProfile: (userId: string, data: Partial<{ nickname: string; signature: string; gender: Gender; birthday: string; avatar: string; name: string }>) =>
      request<Omit<User, 'password'>>(`/profile/${userId}/profile`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    changePassword: (userId: string, oldPassword: string, newPassword: string) =>
      request<null>(`/profile/${userId}/password`, {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      }),
    getAchievements: (memberId: string) =>
      request<PersonalAchievements>(`/profile/${memberId}/achievements`),
  },
};

export default api;

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
  CheckinWithRelations,
  CommentWithRelations,
  Comment,
  SensitiveWord,
  ContentReport,
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
    getAllWithRelations: (params?: Partial<{ challengeId: string; memberId: string; dateFrom: string; dateTo: string; currentMemberId: string; page: number; pageSize: number }>) => {
      const allParams = { ...params, withRelations: 'true' } as Record<string, string | number | undefined>;
      const qs = allParams
        ? '?' +
          Object.entries(allParams)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
            .join('&')
        : '';
      return request<{ items: CheckinWithRelations[]; total: number; hasMore: boolean }>(`/checkins${qs}`);
    },
    getById: (id: string, currentMemberId?: string) =>
      request<CheckinWithRelations>(`/checkins/${id}${currentMemberId ? `?currentMemberId=${currentMemberId}` : ''}`),
    create: (payload: CreateCheckinInput) =>
      request<Checkin | CheckInWithPointsResponse>('/checkins', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  social: {
    toggleCheckinLike: (checkinId: string, memberId: string) =>
      request<{ liked: boolean; likeCount: number }>(`/social/checkins/${checkinId}/like`, {
        method: 'POST',
        body: JSON.stringify({ memberId }),
      }),
    getCheckinLikes: (checkinId: string) =>
      request<{ likes: Array<{ memberId: string; memberName: string; nickname?: string; avatar?: string; createdAt: string }>; count: number }>(
        `/social/checkins/${checkinId}/likes`,
      ),
    createComment: (payload: { checkinId: string; memberId: string; content: string; parentId?: string; replyToMemberId?: string }) =>
      request<CommentWithRelations>(`/social/checkins/${payload.checkinId}/comments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getCheckinComments: (checkinId: string, memberId?: string) =>
      request<CommentWithRelations[]>(
        `/social/checkins/${checkinId}/comments${memberId ? `?memberId=${memberId}` : ''}`,
      ),
    toggleCommentLike: (commentId: string, memberId: string) =>
      request<{ liked: boolean; likeCount: number }>(`/social/comments/${commentId}/like`, {
        method: 'POST',
        body: JSON.stringify({ memberId }),
      }),
    deleteComment: (commentId: string, memberId: string, userRole?: string) =>
      request<{ deleted: boolean }>(`/social/comments/${commentId}`, {
        method: 'DELETE',
        body: JSON.stringify({ memberId, userRole }),
      }),
    reportContent: (payload: { targetType: 'checkin' | 'comment'; targetId: string; reporterId: string; reason: string; description?: string }) =>
      request<ContentReport>('/social/report', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  follow: {
    follow: (followerId: string, followingId: string) =>
      request<{ followed: boolean; isMutual: boolean }>('/follow/follow', {
        method: 'POST',
        body: JSON.stringify({ followerId, followingId }),
      }),
    unfollow: (followerId: string, followingId: string) =>
      request<{ unfollowed: boolean }>('/follow/unfollow', {
        method: 'POST',
        body: JSON.stringify({ followerId, followingId }),
      }),
    getStatus: (followerId: string, followingId: string) =>
      request<{ isFollowing: boolean; isMutual: boolean }>(`/follow/status?followerId=${followerId}&followingId=${followingId}`),
    getFollowing: (userId: string, currentUserId?: string) =>
      request<
        Array<{
          id: string;
          name: string;
          nickname?: string;
          avatar?: string;
          signature?: string;
          isMutual: boolean;
          checkinCount: number;
          followersCount: number;
          followingCount: number;
        }>
      >(`/follow/users/${userId}/following${currentUserId ? `?currentUserId=${currentUserId}` : ''}`),
    getFollowers: (userId: string, currentUserId?: string) =>
      request<
        Array<{
          id: string;
          name: string;
          nickname?: string;
          avatar?: string;
          signature?: string;
          isFollowing: boolean;
          isMutual: boolean;
          checkinCount: number;
          followersCount: number;
          followingCount: number;
        }>
      >(`/follow/users/${userId}/followers${currentUserId ? `?currentUserId=${currentUserId}` : ''}`),
    getCount: (userId: string) =>
      request<{ followers: number; following: number }>(`/follow/users/${userId}/count`),
    getFeed: (userId: string, page = 1, pageSize = 20) =>
      request<{ items: CheckinWithRelations[]; total: number; hasMore: boolean }>(
        `/follow/feed?userId=${userId}&page=${page}&pageSize=${pageSize}`,
      ),
    getSuggested: (userId: string, limit = 10) =>
      request<
        Array<{
          id: string;
          name: string;
          nickname?: string;
          avatar?: string;
          signature?: string;
          checkinCount: number;
          followersCount: number;
          commonFollowing: number;
        }>
      >(`/follow/suggested?userId=${userId}&limit=${limit}`),
  },

  admin: {
    getSensitiveWords: (adminId: string, category?: string) => {
      const qs = category ? `&category=${category}` : '';
      return request<SensitiveWord[]>(`/admin/sensitive-words?adminId=${adminId}${qs}`);
    },
    addSensitiveWord: (payload: { word: string; category: SensitiveWord['category']; adminId: string }) =>
      request<SensitiveWord>('/admin/sensitive-words', {
        method: 'POST',
        body: JSON.stringify({ ...payload, createdBy: payload.adminId }),
      }),
    removeSensitiveWord: (id: string, adminId: string) =>
      request<{ removed: boolean }>(`/admin/sensitive-words/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ adminId }),
      }),
    getReports: (adminId: string, status?: 'pending' | 'resolved' | 'rejected') => {
      const qs = status ? `&status=${status}` : '';
      return request<any[]>(`/admin/reports?adminId=${adminId}${qs}`);
    },
    resolveReport: (id: string, payload: { adminId: string; status: 'resolved' | 'rejected'; resolution: string; deleteContent?: boolean }) =>
      request<{ resolved: boolean }>(`/admin/reports/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteCheckin: (checkinId: string, adminId: string, reason: string) =>
      request<{ deleted: boolean }>(`/admin/checkins/${checkinId}`, {
        method: 'DELETE',
        body: JSON.stringify({ adminId, reason }),
      }),
    getStats: (adminId: string) =>
      request<Record<string, number>>(`/admin/stats?adminId=${adminId}`),
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

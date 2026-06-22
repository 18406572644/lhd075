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
      request<Checkin>('/checkins', { method: 'POST', body: JSON.stringify(payload) }),
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
};

export default api;

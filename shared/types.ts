export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export type ChallengeType = 'running' | 'cycling' | 'swimming' | 'workout' | 'walking' | 'yoga' | 'custom';
export type ChallengeStatus = 'upcoming' | 'active' | 'ended';

export interface Challenge {
  id: string;
  name: string;
  type: ChallengeType;
  description: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  target: {
    minDurationPerDay: number;
    extraField?: 'distance' | 'sets' | 'calories' | 'steps' | 'none';
  };
  coverImage?: string;
  createdBy: string;
  createdAt: string;
  status: ChallengeStatus;
  joinCode: string;
  memberIds: string[];
}

export type CheckinStatus = 'normal' | 'late' | 'duplicate_warning';

export interface Checkin {
  id: string;
  challengeId: string;
  memberId: string;
  date: string;
  submittedAt: string;
  exerciseType: ChallengeType;
  duration: number;
  extraData?: {
    distance?: number;
    sets?: number;
    calories?: number;
    steps?: number;
  };
  note?: string;
  status: CheckinStatus;
  originalCheckinId?: string;
  conflictResolution?: 'keep_original' | 'overwrite' | 'add_duplicate';
}

export interface RankingItem {
  memberId: string;
  memberName: string;
  avatar?: string;
  consecutiveDays: number;
  totalDuration: number;
  totalCheckins: number;
  completionRate: number;
  rank: number;
}

export interface CertificateData {
  id: string;
  challengeId: string;
  challengeName: string;
  memberId: string;
  memberName: string;
  issuedAt: string;
  totalDays: number;
  checkinDays: number;
  completionRate: number;
  totalDuration: number;
  achievement: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface CreateCheckinInput {
  challengeId: string;
  memberId: string;
  date: string;
  exerciseType: ChallengeType;
  duration: number;
  extraData?: Checkin['extraData'];
  note?: string;
  force?: 'keep_original' | 'overwrite' | 'add_duplicate' | 'mark_late';
}

export interface CheckinConflictResponse {
  conflictType: 'duplicate' | 'late' | 'data_mismatch';
  message: string;
  existingRecord?: Checkin;
  submittedData: Partial<Checkin>;
  suggestedAction: 'keep_original' | 'mark_late' | 'confirm_submit' | 'add_duplicate';
}

export interface DashboardStats {
  totalMembers: number;
  activeChallenges: number;
  todayCheckinRate: number;
  totalDuration: number;
  myConsecutiveDays: number;
  myTotalCheckins: number;
}

export interface ChallengeStatistics {
  dailyCheckinTrend: { date: string; count: number }[];
  completionDistribution: { completed: number; partial: number; notStarted: number };
  exerciseTypeDistribution: { type: string; count: number }[];
  heatmapData: { date: string; count: number }[];
  memberProgress: {
    memberId: string;
    memberName: string;
    avatar?: string;
    checkinDays: number;
    totalDuration: number;
    completionRate: number;
  }[];
}

export interface PersonalAnalytics {
  bestTimeSlot: { hour: number; count: number; avgDuration: number }[];
  bestTimeSlotSummary: { label: string; hourRange: string; count: number };
  exerciseTypePreference: { type: string; count: number; duration: number }[];
  weeklyProgress: {
    weekLabel: string;
    totalDuration: number;
    checkinCount: number;
    avgDuration: number;
  }[];
  bodyDataTrend: { date: string; weight?: number; bodyFat?: number }[];
  recentCheckins: { date: string; duration: number; exerciseType: string }[];
  totalStats: {
    totalCheckins: number;
    totalDuration: number;
    avgDurationPerSession: number;
    consecutiveDays: number;
  };
}

export interface TeamAnalytics {
  hourlyHeatmap: { hour: number; count: number }[];
  exerciseTrend: { date: string; [key: string]: number | string }[];
  attendanceTrend: { date: string; rate: number; count: number }[];
  memberActivityTier: {
    tier: 'active' | 'moderate' | 'low' | 'inactive';
    members: { memberId: string; memberName: string; avatar?: string; count: number; duration: number }[];
    count: number;
  }[];
  topPerformers: { memberId: string; memberName: string; avatar?: string; count: number; duration: number }[];
}

export interface AdminChallengeComparison {
  challengeId: string;
  challengeName: string;
  metrics: {
    completionRate: number;
    avgDuration: number;
    totalCheckins: number;
    participationRate: number;
    consistencyScore: number;
    activeDays: number;
  };
}

export interface DeepAnalyticsData {
  personal: PersonalAnalytics | null;
  team: TeamAnalytics | null;
  admin: AdminChallengeComparison[] | null;
}

export type ReportPeriod = 'monthly' | 'quarterly';

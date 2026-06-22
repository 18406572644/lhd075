export type UserRole = 'admin' | 'member';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  nickname?: string;
  signature?: string;
  gender?: Gender;
  birthday?: string;
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

export type CheckinStatus = 'normal' | 'late' | 'duplicate_warning' | 'hidden';

export interface CheckinImage {
  id: string;
  url: string;
  width?: number;
  height?: number;
}

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
  images?: CheckinImage[];
  status: CheckinStatus;
  originalCheckinId?: string;
  conflictResolution?: 'keep_original' | 'overwrite' | 'add_duplicate';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface CheckinLike {
  id: string;
  checkinId: string;
  memberId: string;
  createdAt: string;
}

export interface CommentLike {
  id: string;
  commentId: string;
  memberId: string;
  createdAt: string;
}

export interface CommentMention {
  memberId: string;
  memberName: string;
  startIndex: number;
  endIndex: number;
}

export interface Comment {
  id: string;
  checkinId: string;
  memberId: string;
  parentId?: string;
  replyToMemberId?: string;
  content: string;
  mentions?: CommentMention[];
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface SensitiveWord {
  id: string;
  word: string;
  category: 'violence' | 'pornography' | 'politics' | 'advertising' | 'insult' | 'other';
  createdAt: string;
  createdBy: string;
}

export interface ContentReport {
  id: string;
  targetType: 'checkin' | 'comment';
  targetId: string;
  reporterId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export interface CommentWithRelations extends Comment {
  member?: {
    id: string;
    name: string;
    nickname?: string;
    avatar?: string;
  };
  replyToMember?: {
    id: string;
    name: string;
    nickname?: string;
    avatar?: string;
  };
  likeCount: number;
  isLiked?: boolean;
  replies?: CommentWithRelations[];
  replyCount?: number;
}

export interface CheckinWithRelations extends Checkin {
  member?: {
    id: string;
    name: string;
    nickname?: string;
    avatar?: string;
  };
  challenge?: {
    id: string;
    name: string;
  };
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  isFollowed?: boolean;
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
  images?: CheckinImage[];
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

export interface PersonalAchievements {
  totalCheckinDays: number;
  longestConsecutiveDays: number;
  completedChallenges: number;
  earnedCertificates: number;
  totalPoints: number;
  totalDuration: number;
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

export type PointsActionType = 'checkin' | 'consecutive_checkin' | 'post_dynamic' | 'invite_friend' | 'bonus' | 'exchange';

export type MallItemType = 'badge' | 'certificate_skin' | 'coupon';

export interface UserPoints {
  memberId: string;
  totalPoints: number;
  currentPoints: number;
  lastCheckinDate: string;
  consecutiveDays: number;
  updatedAt: string;
}

export interface PointsRecord {
  id: string;
  memberId: string;
  actionType: PointsActionType;
  points: number;
  description: string;
  relatedId?: string;
  createdAt: string;
}

export interface MallItem {
  id: string;
  name: string;
  type: MallItemType;
  description: string;
  pointsCost: number;
  imageUrl?: string;
  stock: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface UserMallItem {
  id: string;
  memberId: string;
  mallItemId: string;
  name: string;
  type: MallItemType;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  used: boolean;
  usedAt?: string;
  purchasedAt: string;
}

export interface ExchangeRequest {
  mallItemId: string;
  memberId: string;
}

export interface PointsRule {
  actionType: PointsActionType;
  basePoints: number;
  maxPerDay?: number;
  description: string;
}

export const POINTS_RULES: PointsRule[] = [
  { actionType: 'checkin', basePoints: 10, maxPerDay: 1, description: '每日签到' },
  { actionType: 'consecutive_checkin', basePoints: 5, description: '连续签到额外奖励（每连续1天）' },
  { actionType: 'post_dynamic', basePoints: 15, maxPerDay: 3, description: '发布动态' },
  { actionType: 'invite_friend', basePoints: 100, description: '邀请好友注册' },
  { actionType: 'bonus', basePoints: 50, description: '额外奖励' },
];

export interface CheckInWithPointsResponse {
  checkin: Checkin;
  pointsEarned: number;
  pointsBreakdown: {
    checkin: number;
    consecutiveBonus: number;
  };
  totalPoints: number;
  consecutiveDays: number;
}

export type NotificationType = 'checkin_reminder' | 'challenge_update' | 'points_change' | 'system_announcement' | 'interaction';

export interface Notification {
  id: string;
  memberId: string;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

export interface NotificationSettings {
  memberId: string;
  checkin_reminder: boolean;
  challenge_update: boolean;
  points_change: boolean;
  system_announcement: boolean;
  interaction: boolean;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  checkin_reminder: '打卡提醒',
  challenge_update: '挑战动态',
  points_change: '积分变动',
  system_announcement: '系统公告',
  interaction: '互动消息',
};


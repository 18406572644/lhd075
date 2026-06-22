import db from '../db/index';
import type { ApiResponse, UserPoints, PointsRecord, PointsActionType, CheckInWithPointsResponse } from '../../shared/types';
import { POINTS_RULES } from '../../shared/types';
import type { Checkin } from '../../shared/types';
import NotificationService from './NotificationService';

interface PendingPointAction {
  actionType: PointsActionType;
  points: number;
  description: string;
  relatedId?: string;
  checkDailyLimit?: boolean;
}

interface PendingUserPointsUpdate {
  lastCheckinDate?: string;
  consecutiveDays?: number;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export class PointsService {
  private static async createPointsNotification(
    memberId: string,
    points: number,
    description: string,
    relatedId?: string,
  ): Promise<void> {
    try {
      const title = points > 0 ? '积分到账提醒' : '积分消费提醒';
      const content = points > 0
        ? `恭喜你获得 +${points} 积分（${description}）`
        : `你消费了 ${Math.abs(points)} 积分（${description}）`;
      
      await NotificationService.createNotification({
        memberId,
        type: 'points_change',
        title,
        content,
        relatedId,
        relatedType: 'points',
      });
    } catch (err) {
      console.error('Failed to create points notification:', err);
    }
  }
  private static ensureUserPoints(memberId: string): UserPoints {
    let userPoints = db.data.userPoints.find((up) => up.memberId === memberId);
    if (!userPoints) {
      userPoints = {
        memberId,
        totalPoints: 0,
        currentPoints: 0,
        lastCheckinDate: '',
        consecutiveDays: 0,
        updatedAt: new Date().toISOString(),
      };
      db.data.userPoints.push(userPoints);
    }
    return userPoints;
  }

  private static checkDailyLimit(memberId: string, actionType: PointsActionType, rule: { maxPerDay?: number }): boolean {
    if (!rule.maxPerDay) return true;
    const today = formatDateKey(new Date());
    const todayRecords = db.data.pointsRecords.filter(
      (r) =>
        r.memberId === memberId &&
        r.actionType === actionType &&
        formatDateKey(new Date(r.createdAt)) === today,
    );
    return todayRecords.length < rule.maxPerDay;
  }

  private static validateAndPrepareBatch(
    memberId: string,
    actions: PendingPointAction[],
  ): { valid: true; records: PointsRecord[]; totalDelta: number } | { valid: false; errorCode: string; errorMessage: string } {
    const records: PointsRecord[] = [];
    let totalDelta = 0;
    const timestamp = Date.now();

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      if (action.points < 0 && action.actionType !== 'exchange') {
        return { valid: false, errorCode: 'INVALID_OPERATION', errorMessage: '不支持的扣减操作类型' };
      }

      const rule = POINTS_RULES.find((r) => r.actionType === action.actionType);
      if (rule && action.checkDailyLimit !== false) {
        if (!this.checkDailyLimit(memberId, action.actionType, rule)) {
          return {
            valid: false,
            errorCode: 'MAX_PER_DAY_REACHED',
            errorMessage: `今日${rule.description}次数已达上限（${rule.maxPerDay}次）`,
          };
        }
      }

      totalDelta += action.points;

      const record: PointsRecord = {
        id: `pt_rec_${timestamp}_${i.toString().padStart(3, '0')}`,
        memberId,
        actionType: action.actionType,
        points: action.points,
        description: action.description,
        relatedId: action.relatedId,
        createdAt: new Date().toISOString(),
      };
      records.push(record);
    }

    return { valid: true, records, totalDelta };
  }

  static async getUserPoints(memberId: string): Promise<ApiResponse<UserPoints>> {
    await db.read();
    const userPoints = this.ensureUserPoints(memberId);
    await db.write();
    return { success: true, data: { ...userPoints } };
  }

  static async getAllUserPoints(): Promise<ApiResponse<UserPoints[]>> {
    await db.read();
    return { success: true, data: [...db.data.userPoints] };
  }

  static async getPointsRecords(params?: {
    memberId?: string;
    actionType?: PointsActionType;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<ApiResponse<PointsRecord[]>> {
    await db.read();
    let records = [...db.data.pointsRecords];
    if (params?.memberId) records = records.filter((r) => r.memberId === params.memberId);
    if (params?.actionType) records = records.filter((r) => r.actionType === params.actionType);
    if (params?.dateFrom) records = records.filter((r) => r.createdAt >= params.dateFrom);
    if (params?.dateTo) records = records.filter((r) => r.createdAt <= params.dateTo);
    records = records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (params?.limit) records = records.slice(0, params.limit);
    return { success: true, data: records };
  }

  static async addPoints(
    memberId: string,
    actionType: PointsActionType,
    points: number,
    description: string,
    relatedId?: string,
  ): Promise<ApiResponse<PointsRecord>> {
    if (points <= 0) {
      return {
        success: false,
        error: { code: 'INVALID_POINTS', message: '积分必须为正数' },
      };
    }

    await db.read();

    const batch = this.validateAndPrepareBatch(memberId, [
      { actionType, points, description, relatedId },
    ]);
    if (!batch.valid) {
      return { success: false, error: { code: (batch as any).errorCode, message: (batch as any).errorMessage } };
    }

    const userPoints = this.ensureUserPoints(memberId);
    userPoints.totalPoints += batch.totalDelta;
    userPoints.currentPoints += batch.totalDelta;
    userPoints.updatedAt = new Date().toISOString();

    db.data.pointsRecords.push(...batch.records);
    await db.write();

    await this.createPointsNotification(memberId, batch.totalDelta, description, relatedId);

    return { success: true, data: batch.records[0] };
  }

  static async deductPoints(
    memberId: string,
    points: number,
    description: string,
    relatedId?: string,
  ): Promise<ApiResponse<PointsRecord>> {
    if (points <= 0) {
      return {
        success: false,
        error: { code: 'INVALID_POINTS', message: '扣减积分必须为正数' },
      };
    }

    await db.read();

    const userPoints = this.ensureUserPoints(memberId);
    if (userPoints.currentPoints < points) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_POINTS',
          message: `积分不足，当前积分：${userPoints.currentPoints}，需要：${points}`,
        },
      };
    }

    const timestamp = Date.now();
    const record: PointsRecord = {
      id: `pt_rec_${timestamp}`,
      memberId,
      actionType: 'exchange',
      points: -points,
      description,
      relatedId,
      createdAt: new Date().toISOString(),
    };

    userPoints.currentPoints -= points;
    userPoints.updatedAt = new Date().toISOString();

    db.data.pointsRecords.push(record);
    await db.write();

    await this.createPointsNotification(memberId, -points, description, relatedId);

    return { success: true, data: record };
  }

  static async executeBatch(
    memberId: string,
    actions: PendingPointAction[],
    userUpdates?: PendingUserPointsUpdate,
  ): Promise<ApiResponse<{ records: PointsRecord[]; userPoints: UserPoints; totalDelta: number }>> {
    if (!actions || actions.length === 0) {
      return {
        success: false,
        error: { code: 'EMPTY_BATCH', message: '至少需要一个积分操作' },
      };
    }

    await db.read();

    const batch = this.validateAndPrepareBatch(memberId, actions);
    if (!batch.valid) {
      return { success: false, error: { code: (batch as any).errorCode, message: (batch as any).errorMessage } };
    }

    const userPoints = this.ensureUserPoints(memberId);

    if (batch.totalDelta < 0 && userPoints.currentPoints < Math.abs(batch.totalDelta)) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_POINTS',
          message: `积分不足，当前积分：${userPoints.currentPoints}，需要：${Math.abs(batch.totalDelta)}`,
        },
      };
    }

    userPoints.totalPoints += batch.totalDelta > 0 ? batch.totalDelta : 0;
    userPoints.currentPoints += batch.totalDelta;
    userPoints.updatedAt = new Date().toISOString();

    if (userUpdates?.lastCheckinDate !== undefined) {
      userPoints.lastCheckinDate = userUpdates.lastCheckinDate;
    }
    if (userUpdates?.consecutiveDays !== undefined) {
      userPoints.consecutiveDays = userUpdates.consecutiveDays;
    }

    db.data.pointsRecords.push(...batch.records);
    await db.write();

    if (batch.totalDelta !== 0) {
      const totalDesc = actions.map((a) => a.description).join('、');
      await this.createPointsNotification(memberId, batch.totalDelta, totalDesc, actions[0]?.relatedId);
    }

    return {
      success: true,
      data: {
        records: batch.records,
        userPoints: { ...userPoints },
        totalDelta: batch.totalDelta,
      },
    };
  }

  static async calculateConsecutiveDays(memberId: string, checkinDate: string): Promise<number> {
    await db.read();
    const userPoints = this.ensureUserPoints(memberId);
    const lastCheckin = userPoints.lastCheckinDate;

    if (!lastCheckin) {
      return 1;
    }

    const lastDate = new Date(lastCheckin);
    const currentDate = new Date(checkinDate);
    lastDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    const diffTime = currentDate.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return userPoints.consecutiveDays;
    } else if (diffDays === 1) {
      return userPoints.consecutiveDays + 1;
    } else {
      return 1;
    }
  }

  static async processCheckinPoints(
    memberId: string,
    checkin: Checkin,
  ): Promise<ApiResponse<CheckInWithPointsResponse>> {
    const today = formatDateKey(new Date());
    const checkinDate = checkin.date;

    const consecutiveDays = await this.calculateConsecutiveDays(memberId, checkinDate);

    const checkinRule = POINTS_RULES.find((r) => r.actionType === 'checkin')!;
    const consecutiveRule = POINTS_RULES.find((r) => r.actionType === 'consecutive_checkin')!;

    const isLateCheckin = checkin.status === 'late' || checkinDate !== today;
    const checkinPoints = isLateCheckin ? Math.floor(checkinRule.basePoints * 0.5) : checkinRule.basePoints;
    const consecutiveBonus = consecutiveDays > 1 ? (consecutiveDays - 1) * consecutiveRule.basePoints : 0;
    const totalPointsEarned = checkinPoints + consecutiveBonus;

    const actions: PendingPointAction[] = [
      {
        actionType: 'checkin',
        points: checkinPoints,
        description: isLateCheckin ? `补卡 ${checkinDate}` : '每日签到',
        relatedId: checkin.id,
        checkDailyLimit: isLateCheckin ? false : undefined,
      },
    ];

    if (consecutiveBonus > 0) {
      actions.push({
        actionType: 'consecutive_checkin',
        points: consecutiveBonus,
        description: `连续签到${consecutiveDays}天奖励`,
        relatedId: checkin.id,
        checkDailyLimit: false,
      });
    }

    const batchResult = await this.executeBatch(
      memberId,
      actions,
      { lastCheckinDate: checkinDate, consecutiveDays },
    );

    if (!batchResult.success || !batchResult.data) {
      return {
        success: false,
        error: batchResult.error || { code: 'POINTS_ERROR', message: '积分处理失败' },
      };
    }

    return {
      success: true,
      data: {
        checkin,
        pointsEarned: totalPointsEarned,
        pointsBreakdown: {
          checkin: checkinPoints,
          consecutiveBonus,
        },
        totalPoints: batchResult.data.userPoints.currentPoints,
        consecutiveDays,
      },
    };
  }

  static async awardPostDynamicPoints(memberId: string, dynamicId: string): Promise<ApiResponse<PointsRecord>> {
    const rule = POINTS_RULES.find((r) => r.actionType === 'post_dynamic')!;
    return this.addPoints(memberId, 'post_dynamic', rule.basePoints, '发布运动动态', dynamicId);
  }

  static async awardInviteFriendPoints(
    inviterId: string,
    invitedMemberId: string,
  ): Promise<ApiResponse<PointsRecord>> {
    const rule = POINTS_RULES.find((r) => r.actionType === 'invite_friend')!;
    return this.addPoints(
      inviterId,
      'invite_friend',
      rule.basePoints,
      '邀请好友注册奖励',
      invitedMemberId,
    );
  }

  static async awardBonusPoints(
    memberId: string,
    points: number,
    description: string,
    relatedId?: string,
  ): Promise<ApiResponse<PointsRecord>> {
    return this.addPoints(memberId, 'bonus', points, description, relatedId);
  }

  static async getPointsRanking(limit?: number): Promise<
    ApiResponse<
      {
        memberId: string;
        memberName: string;
        avatar?: string;
        totalPoints: number;
        currentPoints: number;
        consecutiveDays: number;
        rank: number;
      }[]
    >
  > {
    await db.read();
    const rankings = db.data.userPoints
      .map((up) => {
        const user = db.data.users.find((u) => u.id === up.memberId);
        return {
          memberId: up.memberId,
          memberName: user?.name || '未知用户',
          avatar: user?.avatar,
          totalPoints: up.totalPoints,
          currentPoints: up.currentPoints,
          consecutiveDays: up.consecutiveDays,
          rank: 0,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    if (limit) {
      return { success: true, data: rankings.slice(0, limit) };
    }
    return { success: true, data: rankings };
  }
}

export default PointsService;

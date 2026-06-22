import db from '../db/index';
import type { ApiResponse, UserPoints, PointsRecord, PointsActionType, CheckInWithPointsResponse } from '../../shared/types';
import { POINTS_RULES } from '../../shared/types';
import type { Checkin } from '../../shared/types';

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export class PointsService {
  static async getUserPoints(memberId: string): Promise<ApiResponse<UserPoints>> {
    await db.read();
    const userPoints = db.data.userPoints.find((up) => up.memberId === memberId);
    if (!userPoints) {
      const newUserPoints: UserPoints = {
        memberId,
        totalPoints: 0,
        currentPoints: 0,
        lastCheckinDate: '',
        consecutiveDays: 0,
        updatedAt: new Date().toISOString(),
      };
      db.data.userPoints.push(newUserPoints);
      await db.write();
      return { success: true, data: newUserPoints };
    }
    return { success: true, data: userPoints };
  }

  static async getAllUserPoints(): Promise<ApiResponse<UserPoints[]>> {
    await db.read();
    return { success: true, data: db.data.userPoints };
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
    await db.read();

    const rule = POINTS_RULES.find((r) => r.actionType === actionType);
    if (rule?.maxPerDay) {
      const today = formatDateKey(new Date());
      const todayRecords = db.data.pointsRecords.filter(
        (r) => r.memberId === memberId && r.actionType === actionType && formatDateKey(new Date(r.createdAt)) === today,
      );
      if (todayRecords.length >= rule.maxPerDay) {
        return {
          success: false,
          error: {
            code: 'MAX_PER_DAY_REACHED',
            message: `今日${rule.description}次数已达上限（${rule.maxPerDay}次）`,
          },
        };
      }
    }

    const userPointsResult = await this.getUserPoints(memberId);
    if (!userPointsResult.success || !userPointsResult.data) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: '用户不存在' } };
    }

    const userPoints = userPointsResult.data;
    userPoints.totalPoints += points;
    userPoints.currentPoints += points;
    userPoints.updatedAt = new Date().toISOString();

    const idx = db.data.userPoints.findIndex((up) => up.memberId === memberId);
    db.data.userPoints[idx] = userPoints;

    const recordId = `pt_rec_${Date.now()}`;
    const record: PointsRecord = {
      id: recordId,
      memberId,
      actionType,
      points,
      description,
      relatedId,
      createdAt: new Date().toISOString(),
    };
    db.data.pointsRecords.push(record);
    await db.write();

    return { success: true, data: record };
  }

  static async deductPoints(
    memberId: string,
    points: number,
    description: string,
    relatedId?: string,
  ): Promise<ApiResponse<PointsRecord>> {
    await db.read();

    const userPointsResult = await this.getUserPoints(memberId);
    if (!userPointsResult.success || !userPointsResult.data) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: '用户不存在' } };
    }

    const userPoints = userPointsResult.data;
    if (userPoints.currentPoints < points) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_POINTS',
          message: `积分不足，当前积分：${userPoints.currentPoints}，需要：${points}`,
        },
      };
    }

    userPoints.currentPoints -= points;
    userPoints.updatedAt = new Date().toISOString();

    const idx = db.data.userPoints.findIndex((up) => up.memberId === memberId);
    db.data.userPoints[idx] = userPoints;

    const recordId = `pt_rec_${Date.now()}`;
    const record: PointsRecord = {
      id: recordId,
      memberId,
      actionType: 'exchange',
      points: -points,
      description,
      relatedId,
      createdAt: new Date().toISOString(),
    };
    db.data.pointsRecords.push(record);
    await db.write();

    return { success: true, data: record };
  }

  static async calculateConsecutiveDays(memberId: string, checkinDate: string): Promise<number> {
    const userPointsResult = await this.getUserPoints(memberId);
    if (!userPointsResult.success || !userPointsResult.data) {
      return 0;
    }

    const userPoints = userPointsResult.data;
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
    await db.read();

    const today = formatDateKey(new Date());
    const checkinDate = checkin.date;

    const consecutiveDays = await this.calculateConsecutiveDays(memberId, checkinDate);

    const checkinRule = POINTS_RULES.find((r) => r.actionType === 'checkin')!;
    const consecutiveRule = POINTS_RULES.find((r) => r.actionType === 'consecutive_checkin')!;

    const checkinPoints = checkinDate === today ? checkinRule.basePoints : Math.floor(checkinRule.basePoints * 0.5);
    const consecutiveBonus = consecutiveDays > 1 ? (consecutiveDays - 1) * consecutiveRule.basePoints : 0;
    const totalPointsEarned = checkinPoints + consecutiveBonus;

    const userPointsResult = await this.getUserPoints(memberId);
    if (!userPointsResult.success || !userPointsResult.data) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: '用户不存在' } };
    }

    const userPoints = userPointsResult.data;

    const checkinDesc = checkinDate === today ? '每日签到' : `补卡 ${checkinDate}`;
    await this.addPoints(memberId, 'checkin', checkinPoints, checkinDesc, checkin.id);

    if (consecutiveBonus > 0) {
      await this.addPoints(
        memberId,
        'consecutive_checkin',
        consecutiveBonus,
        `连续签到${consecutiveDays}天奖励`,
        checkin.id,
      );
    }

    const idx = db.data.userPoints.findIndex((up) => up.memberId === memberId);
    db.data.userPoints[idx] = {
      ...userPoints,
      lastCheckinDate: checkinDate,
      consecutiveDays,
      updatedAt: new Date().toISOString(),
    };
    await db.write();

    const updatedUserPoints = await this.getUserPoints(memberId);

    return {
      success: true,
      data: {
        checkin,
        pointsEarned: totalPointsEarned,
        pointsBreakdown: {
          checkin: checkinPoints,
          consecutiveBonus,
        },
        totalPoints: updatedUserPoints.data?.currentPoints || 0,
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

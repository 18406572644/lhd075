import db from '../db/index';
import type { Checkin, ChallengeType, ApiResponse, CheckinConflictResponse, CreateCheckinInput, CheckInWithPointsResponse } from '../../shared/types';
import PointsService from './PointsService';

const LATE_CUTOFF_HOUR = 22;

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export class CheckinService {
  static async getAll(params?: {
    challengeId?: string;
    memberId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<Checkin[]>> {
    await db.read();
    let checkins = [...db.data.checkins];
    if (params?.challengeId) checkins = checkins.filter((c) => c.challengeId === params.challengeId);
    if (params?.memberId) checkins = checkins.filter((c) => c.memberId === params.memberId);
    if (params?.dateFrom) checkins = checkins.filter((c) => c.date >= params.dateFrom);
    if (params?.dateTo) checkins = checkins.filter((c) => c.date <= params.dateTo);
    return {
      success: true,
      data: checkins.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    };
  }

  static async getMemberConsecutiveDays(memberId: string, challengeId: string): Promise<number> {
    const { data = [] } = await CheckinService.getAll({ memberId, challengeId });
    const dates = new Set(data.map((c) => c.date));
    if (dates.size === 0) return 0;
    let consecutive = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = formatDateKey(d);
      if (dates.has(key)) consecutive++;
      else if (i === 0) continue;
      else break;
    }
    return consecutive;
  }

  static async create(input: CreateCheckinInput): Promise<ApiResponse<Checkin | CheckinConflictResponse | CheckInWithPointsResponse>> {
    await db.read();

    const challenge = db.data.challenges.find((c) => c.id === input.challengeId);
    if (!challenge) {
      return { success: false, error: { code: 'CHALLENGE_NOT_FOUND', message: '挑战不存在' } };
    }

    const today = formatDateKey(new Date());
    const submittedDate = new Date();
    const targetDate = new Date(input.date);
    targetDate.setHours(0, 0, 0, 0);
    const startDate = new Date(challenge.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(challenge.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (targetDate < startDate || targetDate > endDate) {
      return {
        success: false,
        error: { code: 'DATE_OUT_OF_RANGE', message: '打卡日期不在挑战期间内' },
      };
    }

    const existingSameDay = db.data.checkins.find(
      (c) => c.challengeId === input.challengeId && c.memberId === input.memberId && c.date === input.date
    );

    const isLate =
      input.date !== today || submittedDate.getHours() >= LATE_CUTOFF_HOUR;

    if (existingSameDay && !input.force) {
      const resp: CheckinConflictResponse = {
        conflictType: 'duplicate',
        message: `今天已经完成打卡（${existingSameDay.duration ?? 0}分钟）。是否要保留原始记录？`,
        existingRecord: existingSameDay,
        submittedData: input,
        suggestedAction: 'keep_original',
      };
      return { success: false, error: { code: 'DUPLICATE_CHECKIN', message: resp.message, details: resp } };
    }

    if (isLate && !input.force) {
      const resp: CheckinConflictResponse = {
        conflictType: 'late',
        message: input.date !== today
          ? `正在补卡 ${input.date} 的记录，系统将标记为补卡。`
          : `已超过当日22:00，打卡将标记为补卡。确认继续吗？`,
        submittedData: input,
        suggestedAction: 'mark_late',
      };
      return { success: false, error: { code: 'LATE_CHECKIN', message: resp.message, details: resp } };
    }

    if (existingSameDay) {
      if (input.force === 'keep_original') {
        return { success: true, data: existingSameDay };
      }
      if (input.force === 'overwrite') {
        const idx = db.data.checkins.findIndex((c) => c.id === existingSameDay.id);
        const original = { ...db.data.checkins[idx] };
        db.data.checkins[idx] = {
          ...db.data.checkins[idx],
          exerciseType: input.exerciseType,
          duration: input.duration,
          extraData: input.extraData,
          note: input.note,
          submittedAt: new Date().toISOString(),
          status: 'duplicate_warning',
          originalCheckinId: existingSameDay.id,
          conflictResolution: 'overwrite',
        };
        const archiveId = `chk_arch_${Date.now()}`;
        db.data.checkins.push({
          ...original,
          id: archiveId,
          status: 'duplicate_warning',
          originalCheckinId: existingSameDay.id,
          conflictResolution: 'keep_original',
          note: (original.note || '') + ' [原始记录已保留，被新数据覆盖]',
        });
        await db.write();
        return { success: true, data: db.data.checkins[idx] };
      }
      if (input.force === 'add_duplicate') {
        const newId = `chk_${String(Date.now()).slice(-8)}`;
        const record: Checkin = {
          id: newId,
          challengeId: input.challengeId,
          memberId: input.memberId,
          date: input.date,
          submittedAt: new Date().toISOString(),
          exerciseType: input.exerciseType,
          duration: input.duration,
          extraData: input.extraData,
          note: (input.note || '') + ' [重复打卡记录]',
          status: 'duplicate_warning',
          originalCheckinId: existingSameDay.id,
          conflictResolution: 'add_duplicate',
        };
        db.data.checkins.push(record);
        await db.write();

        const pointsResult = await PointsService.awardBonusPoints(
          input.memberId,
          3,
          `额外打卡奖励（${input.date}）`,
          newId,
        );
        if (pointsResult.success && pointsResult.data) {
          const finalPoints = await PointsService.getUserPoints(input.memberId);
          return {
            success: true,
            data: {
              checkin: record,
              pointsEarned: 3,
              pointsBreakdown: { checkin: 3, consecutiveBonus: 0 },
              totalPoints: finalPoints.data?.currentPoints || 0,
              consecutiveDays: finalPoints.data?.consecutiveDays || 0,
            },
          };
        }
        return { success: true, data: record };
      }
    }

    const newId = `chk_${String(Date.now()).slice(-8)}`;
    const record: Checkin = {
      id: newId,
      challengeId: input.challengeId,
      memberId: input.memberId,
      date: input.date,
      submittedAt: new Date().toISOString(),
      exerciseType: input.exerciseType,
      duration: input.duration,
      extraData: input.extraData,
      note: input.note,
      status: input.force === 'mark_late' || isLate ? 'late' : 'normal',
    };
    db.data.checkins.push(record);
    await db.write();

    const pointsResult = await PointsService.processCheckinPoints(input.memberId, record);
    if (pointsResult.success && pointsResult.data) {
      return { success: true, data: pointsResult.data };
    }

    return { success: true, data: record };
  }
}

export default CheckinService;

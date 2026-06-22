import db from '../db/index';
import type { Checkin, ChallengeType, ApiResponse, CheckinConflictResponse, CreateCheckinInput, CheckInWithPointsResponse, CheckinWithRelations } from '../../shared/types';
import PointsService from './PointsService';
import SocialService from './SocialService';

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
    let checkins = [...db.data.checkins].filter((c) => !c.isDeleted && c.status !== 'hidden');
    if (params?.challengeId) checkins = checkins.filter((c) => c.challengeId === params.challengeId);
    if (params?.memberId) checkins = checkins.filter((c) => c.memberId === params.memberId);
    if (params?.dateFrom) checkins = checkins.filter((c) => c.date >= params.dateFrom);
    if (params?.dateTo) checkins = checkins.filter((c) => c.date <= params.dateTo);
    return {
      success: true,
      data: checkins.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    };
  }

  static async getAllWithRelations(params: {
    challengeId?: string;
    memberId?: string;
    dateFrom?: string;
    dateTo?: string;
    currentMemberId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: CheckinWithRelations[]; total: number; hasMore: boolean }>> {
    await db.read();
    let checkins = [...db.data.checkins].filter((c) => !c.isDeleted && c.status !== 'hidden');
    if (params.challengeId) checkins = checkins.filter((c) => c.challengeId === params.challengeId);
    if (params.memberId) checkins = checkins.filter((c) => c.memberId === params.memberId);
    if (params.dateFrom) checkins = checkins.filter((c) => c.date >= params.dateFrom);
    if (params.dateTo) checkins = checkins.filter((c) => c.date <= params.dateTo);
    checkins.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    const total = checkins.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const start = (page - 1) * pageSize;
    checkins = checkins.slice(start, start + pageSize);

    const items: CheckinWithRelations[] = [];
    for (const c of checkins) {
      const user = db.data.users.find((u) => u.id === c.memberId);
      const challenge = db.data.challenges.find((ch) => ch.id === c.challengeId);
      const likeCount = db.data.checkinLikes.filter((l) => l.checkinId === c.id).length;
      const commentCount = db.data.comments.filter((cm) => cm.checkinId === c.id && !cm.isDeleted).length;
      const isLiked = params.currentMemberId
        ? db.data.checkinLikes.some((l) => l.checkinId === c.id && l.memberId === params.currentMemberId)
        : false;
      const isFollowed = params.currentMemberId && params.currentMemberId !== c.memberId
        ? db.data.follows.some((f) => f.followerId === params.currentMemberId && f.followingId === c.memberId)
        : false;

      items.push({
        ...c,
        member: user ? { id: user.id, name: user.name, nickname: user.nickname, avatar: user.avatar } : undefined,
        challenge: challenge ? { id: challenge.id, name: challenge.name } : undefined,
        likeCount,
        commentCount,
        isLiked,
        isFollowed,
      });
    }

    return {
      success: true,
      data: {
        items,
        total,
        hasMore: start + pageSize < total,
      },
    };
  }

  static async getById(checkinId: string, currentMemberId?: string): Promise<ApiResponse<CheckinWithRelations>> {
    await db.read();
    const c = db.data.checkins.find((x) => x.id === checkinId && !x.isDeleted && x.status !== 'hidden');
    if (!c) return { success: false, error: { code: 'NOT_FOUND', message: '打卡不存在' } };

    const user = db.data.users.find((u) => u.id === c.memberId);
    const challenge = db.data.challenges.find((ch) => ch.id === c.challengeId);
    const likeCount = db.data.checkinLikes.filter((l) => l.checkinId === c.id).length;
    const commentCount = db.data.comments.filter((cm) => cm.checkinId === c.id && !cm.isDeleted).length;
    const isLiked = currentMemberId
      ? db.data.checkinLikes.some((l) => l.checkinId === c.id && l.memberId === currentMemberId)
      : false;
    const isFollowed = currentMemberId && currentMemberId !== c.memberId
      ? db.data.follows.some((f) => f.followerId === currentMemberId && f.followingId === c.memberId)
      : false;

    return {
      success: true,
      data: {
        ...c,
        member: user ? { id: user.id, name: user.name, nickname: user.nickname, avatar: user.avatar } : undefined,
        challenge: challenge ? { id: challenge.id, name: challenge.name } : undefined,
        likeCount,
        commentCount,
        isLiked,
        isFollowed,
      },
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
      (c) => c.challengeId === input.challengeId && c.memberId === input.memberId && c.date === input.date && !c.isDeleted
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

    let processedNote = input.note || '';
    let sensitiveWarning: { matched: string[]; message: string } | undefined;
    if (processedNote.trim()) {
      const { filtered, hasSensitive, matchedWords } = await SocialService.filterSensitiveWords(processedNote);
      processedNote = filtered;
      if (hasSensitive) {
        sensitiveWarning = {
          matched: matchedWords,
          message: `内容包含敏感词：${matchedWords.join('、')}，已自动过滤`,
        };
      }
    }

    const validImages = Array.isArray(input.images)
      ? input.images.filter((img) => img && typeof img.url === 'string' && img.url.length > 0)
      : [];

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
          note: processedNote,
          images: validImages.length ? validImages : existingSameDay.images,
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
        const result: any = { success: true, data: db.data.checkins[idx] };
        if (sensitiveWarning) result.data._sensitiveWarning = sensitiveWarning;
        return result;
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
          note: (processedNote || '') + ' [重复打卡记录]',
          images: validImages.length ? validImages : undefined,
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
          const data: any = {
            checkin: record,
            pointsEarned: 3,
            pointsBreakdown: { checkin: 3, consecutiveBonus: 0 },
            totalPoints: finalPoints.data?.currentPoints || 0,
            consecutiveDays: finalPoints.data?.consecutiveDays || 0,
          };
          if (sensitiveWarning) data._sensitiveWarning = sensitiveWarning;
          return { success: true, data };
        }
        if (sensitiveWarning) {
          (record as any)._sensitiveWarning = sensitiveWarning;
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
      note: processedNote,
      images: validImages.length ? validImages : undefined,
      status: input.force === 'mark_late' || isLate ? 'late' : 'normal',
    };
    db.data.checkins.push(record);
    await db.write();

    const pointsResult = await PointsService.processCheckinPoints(input.memberId, record);
    if (pointsResult.success && pointsResult.data) {
      if (sensitiveWarning) {
        (pointsResult.data as any)._sensitiveWarning = sensitiveWarning;
      }
      return { success: true, data: pointsResult.data };
    }

    if (sensitiveWarning) {
      (record as any)._sensitiveWarning = sensitiveWarning;
    }
    return { success: true, data: record };
  }
}

export default CheckinService;

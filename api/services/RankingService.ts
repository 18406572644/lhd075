import db from '../db/index';
import type { RankingItem, ApiResponse } from '../../shared/types';
import CheckinService from './CheckinService';

export class RankingService {
  static async getChallengeRanking(challengeId: string, sortBy: 'consecutive' | 'duration' | 'checkins' | 'rate' = 'consecutive'): Promise<ApiResponse<RankingItem[]>> {
    await db.read();
    const challenge = db.data.challenges.find((c) => c.id === challengeId);
    if (!challenge) {
      return { success: false, error: { code: 'CHALLENGE_NOT_FOUND', message: '挑战不存在' } };
    }

    const rankings: RankingItem[] = [];

    for (const memberId of challenge.memberIds) {
      const user = db.data.users.find((u) => u.id === memberId);
      if (!user) continue;
      const memberCheckins = db.data.checkins.filter(
        (c) => c.challengeId === challengeId && c.memberId === memberId && c.status !== 'duplicate_warning'
      );
      const totalCheckins = new Set(memberCheckins.map((c) => c.date)).size;
      const totalDuration = memberCheckins.reduce((sum, c) => sum + (c.duration ?? 0), 0);
      const completionRate = Math.round((totalCheckins / challenge.totalDays) * 100);
      const consecutiveDays = await CheckinService.getMemberConsecutiveDays(memberId, challengeId);

      rankings.push({
        memberId,
        memberName: user.name,
        avatar: user.avatar,
        consecutiveDays,
        totalDuration,
        totalCheckins,
        completionRate,
        rank: 0,
      });
    }

    rankings.sort((a, b) => {
      if (sortBy === 'duration') return b.totalDuration - a.totalDuration;
      if (sortBy === 'checkins') return b.totalCheckins - a.totalCheckins;
      if (sortBy === 'rate') return b.completionRate - a.completionRate;
      return b.consecutiveDays - a.consecutiveDays;
    });

    rankings.forEach((r, i) => (r.rank = i + 1));
    return { success: true, data: rankings };
  }
}

export default RankingService;

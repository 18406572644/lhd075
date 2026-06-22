import db from '../db/index';
import type { ChallengeStatistics, DashboardStats, ApiResponse } from '../../shared/types';

export class AnalyticsService {
  static async getDashboardStats(userId?: string, userRole?: 'admin' | 'member'): Promise<ApiResponse<DashboardStats>> {
    await db.read();
    const today = new Date().toISOString().split('T')[0];

    const totalMembers = db.data.users.filter((u) => u.role === 'member').length;
    const activeChallenges = db.data.challenges.filter((c) => {
      const s = new Date(c.startDate);
      const e = new Date(c.endDate);
      const t = new Date();
      return t >= s && t <= e;
    }).length;

    let totalCheckinsToday = 0;
    let totalDuration = 0;
    let myConsecutiveDays = 0;
    let myTotalCheckins = 0;

    const allValidCheckins = db.data.checkins.filter((c) => c.status !== 'duplicate_warning');
    totalCheckinsToday = allValidCheckins.filter((c) => c.date === today).length;
    totalDuration = allValidCheckins.reduce((sum, c) => sum + c.duration, 0);

    const membersWithActiveChallenges = new Set<string>();
    db.data.challenges.forEach((c) => {
      const s = new Date(c.startDate);
      const e = new Date(c.endDate);
      const t = new Date();
      if (t >= s && t <= e) c.memberIds.forEach((id) => membersWithActiveChallenges.add(id));
    });

    const todayCheckinRate =
      membersWithActiveChallenges.size > 0
        ? Math.round((totalCheckinsToday / membersWithActiveChallenges.size) * 100)
        : 0;

    if (userId && userRole === 'member') {
      const myCheckins = allValidCheckins.filter((c) => c.memberId === userId);
      myTotalCheckins = new Set(myCheckins.map((c) => c.date)).size;

      const dates = new Set(myCheckins.map((c) => c.date));
      const d = new Date();
      for (let i = 0; i < 365; i++) {
        const key = new Date(d.getTime() - i * 86400000).toISOString().split('T')[0];
        if (dates.has(key)) myConsecutiveDays++;
        else if (i === 0) continue;
        else break;
      }
    }

    return {
      success: true,
      data: {
        totalMembers,
        activeChallenges,
        todayCheckinRate,
        totalDuration,
        myConsecutiveDays,
        myTotalCheckins,
      },
    };
  }

  static async getChallengeStatistics(challengeId: string): Promise<ApiResponse<ChallengeStatistics>> {
    await db.read();
    const challenge = db.data.challenges.find((c) => c.id === challengeId);
    if (!challenge) {
      return { success: false, error: { code: 'CHALLENGE_NOT_FOUND', message: '挑战不存在' } };
    }

    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);
    const today = new Date();
    const actualEnd = end < today ? end : today;

    const dailyCheckinTrend: { date: string; count: number }[] = [];
    const heatmapData: { date: string; count: number }[] = [];
    const exerciseMap = new Map<string, number>();

    const validCheckins = db.data.checkins.filter(
      (c) => c.challengeId === challengeId && c.status !== 'duplicate_warning'
    );

    for (let d = new Date(start); d <= actualEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayCheckins = validCheckins.filter((c) => c.date === dateStr);
      const uniqueMembers = new Set(dayCheckins.map((c) => c.memberId)).size;
      dailyCheckinTrend.push({ date: dateStr.slice(5), count: uniqueMembers });
      heatmapData.push({ date: dateStr, count: uniqueMembers });
      dayCheckins.forEach((c) => {
        const t = c.exerciseType;
        exerciseMap.set(t, (exerciseMap.get(t) || 0) + 1);
      });
    }

    const memberProgress: ChallengeStatistics['memberProgress'] = [];
    let completedCount = 0;
    let partialCount = 0;
    let notStartedCount = 0;

    for (const mid of challenge.memberIds) {
      const user = db.data.users.find((u) => u.id === mid);
      if (!user) continue;
      const myCheckins = validCheckins.filter((c) => c.memberId === mid);
      const checkinDays = new Set(myCheckins.map((c) => c.date)).size;
      const totalDur = myCheckins.reduce((s, c) => s + c.duration, 0);
      const rate = Math.round((checkinDays / challenge.totalDays) * 100);
      memberProgress.push({
        memberId: mid,
        memberName: user.name,
        avatar: user.avatar,
        checkinDays,
        totalDuration: totalDur,
        completionRate: rate,
      });
      if (rate >= 100) completedCount++;
      else if (rate >= 30) partialCount++;
      else if (rate === 0) notStartedCount++;
      else partialCount++;
    }

    const exerciseTypeDistribution = Array.from(exerciseMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    return {
      success: true,
      data: {
        dailyCheckinTrend,
        completionDistribution: {
          completed: completedCount,
          partial: partialCount,
          notStarted: notStartedCount,
        },
        exerciseTypeDistribution,
        heatmapData,
        memberProgress,
      },
    };
  }
}

export default AnalyticsService;

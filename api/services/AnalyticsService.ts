import db from '../db/index';
import type {
  ChallengeStatistics,
  DashboardStats,
  ApiResponse,
  PersonalAnalytics,
  TeamAnalytics,
  AdminChallengeComparison,
  DeepAnalyticsData,
} from '../../shared/types';

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

  static async getPersonalAnalytics(memberId: string): Promise<ApiResponse<PersonalAnalytics>> {
    await db.read();
    const allCheckins = db.data.checkins.filter(
      (c) => c.memberId === memberId && c.status !== 'duplicate_warning'
    );

    if (allCheckins.length === 0) {
      return { success: true, data: null as unknown as PersonalAnalytics };
    }

    const hourMap = new Map<number, { count: number; totalDuration: number }>();
    for (let h = 0; h < 24; h++) hourMap.set(h, { count: 0, totalDuration: 0 });
    allCheckins.forEach((c) => {
      const hour = new Date(c.submittedAt).getHours();
      const cur = hourMap.get(hour)!;
      cur.count += 1;
      cur.totalDuration += c.duration;
    });
    const bestTimeSlot = Array.from(hourMap.entries()).map(([hour, v]) => ({
      hour,
      count: v.count,
      avgDuration: v.count > 0 ? Math.round(v.totalDuration / v.count) : 0,
    }));

    const bestHour = bestTimeSlot.reduce((best, cur) => (cur.count > best.count ? cur : best), bestTimeSlot[0]);
    let timeSlotLabel = '夜间';
    const hourRange = `${bestHour.hour}:00-${bestHour.hour + 1}:00`;
    if (bestHour.hour >= 5 && bestHour.hour < 9) { timeSlotLabel = '清晨'; }
    else if (bestHour.hour >= 9 && bestHour.hour < 12) { timeSlotLabel = '上午'; }
    else if (bestHour.hour >= 12 && bestHour.hour < 14) { timeSlotLabel = '午间'; }
    else if (bestHour.hour >= 14 && bestHour.hour < 18) { timeSlotLabel = '下午'; }
    else if (bestHour.hour >= 18 && bestHour.hour < 22) { timeSlotLabel = '晚间'; }
    const bestTimeSlotSummary = { label: timeSlotLabel, hourRange, count: bestHour.count };

    const typeMap = new Map<string, { count: number; duration: number }>();
    allCheckins.forEach((c) => {
      const cur = typeMap.get(c.exerciseType) || { count: 0, duration: 0 };
      cur.count += 1;
      cur.duration += c.duration;
      typeMap.set(c.exerciseType, cur);
    });
    const exerciseTypePreference = Array.from(typeMap.entries()).map(([type, v]) => ({
      type, count: v.count, duration: v.duration,
    })).sort((a, b) => b.count - a.count);

    const weekMap = new Map<string, { label: string; totalDuration: number; checkinCount: number; dates: Set<string> }>();
    allCheckins.forEach((c) => {
      const d = new Date(c.date);
      const year = d.getFullYear();
      const onejan = new Date(year, 0, 1);
      const weekNum = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
      const key = `${year}-W${weekNum}`;
      const cur = weekMap.get(key) || { label: `第${weekNum}周`, totalDuration: 0, checkinCount: 0, dates: new Set<string>() };
      cur.totalDuration += c.duration;
      cur.dates.add(c.date);
      cur.checkinCount = cur.dates.size;
      weekMap.set(key, cur);
    });
    const weeklyProgress = Array.from(weekMap.values())
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-6)
      .map((w) => ({
        weekLabel: w.label,
        totalDuration: w.totalDuration,
        checkinCount: w.checkinCount,
        avgDuration: w.checkinCount > 0 ? Math.round(w.totalDuration / w.checkinCount) : 0,
      }));

    const bodyDataTrend: { date: string; weight?: number; bodyFat?: number }[] = [];
    const mockWeights = [68.5, 68.2, 67.9, 67.6, 67.3, 67.1, 66.8, 66.5];
    const mockBodyFats = [22.5, 22.1, 21.8, 21.5, 21.2, 20.9, 20.6, 20.3];
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 7 * 86400000);
      bodyDataTrend.push({
        date: d.toISOString().split('T')[0],
        weight: mockWeights[7 - i],
        bodyFat: mockBodyFats[7 - i],
      });
    }

    const recentCheckins = allCheckins
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((c) => ({ date: c.date, duration: c.duration, exerciseType: c.exerciseType }));

    const dates = new Set(allCheckins.map((c) => c.date));
    let consecutiveDays = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = new Date(d.getTime() - i * 86400000).toISOString().split('T')[0];
      if (dates.has(key)) consecutiveDays++;
      else if (i === 0) continue;
      else break;
    }
    const totalDuration = allCheckins.reduce((s, c) => s + c.duration, 0);

    return {
      success: true,
      data: {
        bestTimeSlot,
        bestTimeSlotSummary,
        exerciseTypePreference,
        weeklyProgress,
        bodyDataTrend,
        recentCheckins,
        totalStats: {
          totalCheckins: allCheckins.length,
          totalDuration,
          avgDurationPerSession: allCheckins.length > 0 ? Math.round(totalDuration / allCheckins.length) : 0,
          consecutiveDays,
        },
      },
    };
  }

  static async getTeamAnalytics(challengeId?: string): Promise<ApiResponse<TeamAnalytics>> {
    await db.read();
    let validCheckins = db.data.checkins.filter((c) => c.status !== 'duplicate_warning');
    if (challengeId) {
      validCheckins = validCheckins.filter((c) => c.challengeId === challengeId);
    }

    if (validCheckins.length === 0) {
      return { success: true, data: null as unknown as TeamAnalytics };
    }

    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);
    validCheckins.forEach((c) => {
      const hour = new Date(c.submittedAt).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });
    const hourlyHeatmap = Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count }));

    const dateTypeMap = new Map<string, Map<string, number>>();
    const allTypes = new Set<string>();
    validCheckins.forEach((c) => {
      const d = c.date.slice(5);
      if (!dateTypeMap.has(d)) dateTypeMap.set(d, new Map<string, number>());
      const dm = dateTypeMap.get(d)!;
      dm.set(c.exerciseType, (dm.get(c.exerciseType) || 0) + 1);
      allTypes.add(c.exerciseType);
    });
    const sortedDates = Array.from(dateTypeMap.keys()).sort();
    const exerciseTrend = sortedDates.map((date) => {
      const row: { date: string; [key: string]: number | string } = { date };
      const dm = dateTypeMap.get(date)!;
      allTypes.forEach((t) => { row[t] = dm.get(t) || 0; });
      return row;
    });

    let memberIds = new Set<string>();
    if (challengeId) {
      const challenge = db.data.challenges.find((c) => c.id === challengeId);
      if (challenge) memberIds = new Set(challenge.memberIds);
    } else {
      db.data.users.filter((u) => u.role === 'member').forEach((u) => memberIds.add(u.id));
    }
    const attendanceMap = new Map<string, { count: number; unique: Set<string> }>();
    validCheckins.forEach((c) => {
      if (!attendanceMap.has(c.date)) attendanceMap.set(c.date, { count: 0, unique: new Set<string>() });
      const entry = attendanceMap.get(c.date)!;
      if (!entry.unique.has(c.memberId)) { entry.count++; entry.unique.add(c.memberId); }
    });
    const attendanceTrend = Array.from(attendanceMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: date.slice(5),
        rate: memberIds.size > 0 ? Math.round((v.count / memberIds.size) * 100) : 0,
        count: v.count,
      }));

    const memberStatMap = new Map<string, { memberId: string; memberName: string; avatar?: string; count: number; duration: number }>();
    validCheckins.forEach((c) => {
      if (!memberStatMap.has(c.memberId)) {
        const user = db.data.users.find((u) => u.id === c.memberId);
        memberStatMap.set(c.memberId, {
          memberId: c.memberId,
          memberName: user?.name || '未知',
          avatar: user?.avatar,
          count: 0,
          duration: 0,
        });
      }
      const m = memberStatMap.get(c.memberId)!;
      m.count += 1;
      m.duration += c.duration;
    });
    const memberStats = Array.from(memberStatMap.values());
    const maxCount = Math.max(...memberStats.map((m) => m.count), 1);

    const tiers: TeamAnalytics['memberActivityTier'] = [
      { tier: 'active', members: [], count: 0 },
      { tier: 'moderate', members: [], count: 0 },
      { tier: 'low', members: [], count: 0 },
      { tier: 'inactive', members: [], count: 0 },
    ];
    memberIds.forEach((mid) => {
      const stat = memberStatMap.get(mid);
      const user = db.data.users.find((u) => u.id === mid);
      if (!stat) {
        tiers[3].members.push({ memberId: mid, memberName: user?.name || '未知', avatar: user?.avatar, count: 0, duration: 0 });
        tiers[3].count++;
        return;
      }
      const ratio = stat.count / maxCount;
      let idx = 2;
      if (ratio >= 0.75) idx = 0;
      else if (ratio >= 0.4) idx = 1;
      else if (ratio >= 0.15) idx = 2;
      else idx = 3;
      tiers[idx].members.push(stat);
      tiers[idx].count++;
    });

    const topPerformers = memberStats.sort((a, b) => b.duration - a.duration).slice(0, 5);

    return {
      success: true,
      data: { hourlyHeatmap, exerciseTrend, attendanceTrend, memberActivityTier: tiers, topPerformers },
    };
  }

  static async getAdminChallengeComparison(): Promise<ApiResponse<AdminChallengeComparison[]>> {
    await db.read();
    const challenges = db.data.challenges;
    const result: AdminChallengeComparison[] = [];

    for (const challenge of challenges) {
      const checkins = db.data.checkins.filter(
        (c) => c.challengeId === challenge.id && c.status !== 'duplicate_warning'
      );
      const totalCheckins = checkins.length;
      const totalDuration = checkins.reduce((s, c) => s + c.duration, 0);
      const avgDuration = totalCheckins > 0 ? Math.round(totalDuration / totalCheckins) : 0;

      const memberDaysMap = new Map<string, Set<string>>();
      checkins.forEach((c) => {
        if (!memberDaysMap.has(c.memberId)) memberDaysMap.set(c.memberId, new Set<string>());
        memberDaysMap.get(c.memberId)!.add(c.date);
      });
      const memberProgress = Array.from(memberDaysMap.values()).map((days) => days.size);
      const avgCompletionRate = memberProgress.length > 0
        ? Math.round(memberProgress.reduce((s, d) => s + Math.round((d / challenge.totalDays) * 100), 0) / memberProgress.length)
        : 0;
      const participationRate = challenge.memberIds.length > 0
        ? Math.round((memberDaysMap.size / challenge.memberIds.length) * 100)
        : 0;

      const uniqueDates = new Set(checkins.map((c) => c.date));
      const activeDays = uniqueDates.size;
      const expectedDays = challenge.totalDays;
      const consistencyScore = expectedDays > 0 ? Math.round((activeDays / expectedDays) * 100) : 0;

      result.push({
        challengeId: challenge.id,
        challengeName: challenge.name,
        metrics: {
          completionRate: avgCompletionRate,
          avgDuration,
          totalCheckins,
          participationRate,
          consistencyScore,
          activeDays,
        },
      });
    }

    return { success: true, data: result };
  }

  static async getDeepAnalytics(memberId?: string, userRole?: 'admin' | 'member', challengeId?: string): Promise<ApiResponse<DeepAnalyticsData>> {
    const result: DeepAnalyticsData = { personal: null, team: null, admin: null };

    if (memberId && userRole === 'member') {
      const personal = await this.getPersonalAnalytics(memberId);
      if (personal.success) result.personal = personal.data || null;
    }

    if (userRole === 'admin' || (userRole === 'member' && memberId)) {
      const team = await this.getTeamAnalytics(challengeId);
      if (team.success) result.team = team.data || null;
    }

    if (userRole === 'admin') {
      const admin = await this.getAdminChallengeComparison();
      if (admin.success) result.admin = admin.data || null;
    }

    return { success: true, data: result };
  }
}

export default AnalyticsService;

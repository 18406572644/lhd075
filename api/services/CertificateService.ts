import db from '../db/index';
import type { CertificateData, ApiResponse } from '../../shared/types';

function getAchievement(rate: number, days: number): string {
  if (rate >= 100 && days >= 21) return '全勤运动先锋';
  if (rate >= 90) return '卓越坚持者';
  if (rate >= 75) return '健身达人';
  if (rate >= 60) return '运动健将';
  if (rate >= 40) return '活力参与者';
  return '健康探索者';
}

export class CertificateService {
  static async getOrCreate(challengeId: string, memberId: string): Promise<ApiResponse<CertificateData>> {
    await db.read();
    const challenge = db.data.challenges.find((c) => c.id === challengeId);
    if (!challenge) {
      return { success: false, error: { code: 'CHALLENGE_NOT_FOUND', message: '挑战不存在' } };
    }
    const user = db.data.users.find((u) => u.id === memberId);
    if (!user) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: '用户不存在' } };
    }

    const endDate = new Date(challenge.endDate);
    endDate.setHours(23, 59, 59, 999);
    const now = new Date();
    const isEnded = now > endDate;

    const validCheckins = db.data.checkins.filter(
      (c) => c.challengeId === challengeId && c.memberId === memberId && c.status !== 'duplicate_warning'
    );
    const checkinDays = new Set(validCheckins.map((c) => c.date)).size;
    const totalDuration = validCheckins.reduce((s, c) => s + c.duration, 0);
    const completionRate = Math.round((checkinDays / challenge.totalDays) * 100);

    if (!isEnded && completionRate < 50) {
      return {
        success: false,
        error: {
          code: 'CERT_NOT_ELIGIBLE',
          message: `挑战尚未结束且完成率不足50%（当前${completionRate}%），暂无法生成证书。`,
        },
      };
    }

    let cert = db.data.certificates.find(
      (c) => c.challengeId === challengeId && c.memberId === memberId
    );

    if (!cert) {
      cert = {
        id: `cert_${Date.now()}`,
        challengeId,
        challengeName: challenge.name,
        memberId,
        memberName: user.name,
        issuedAt: new Date().toISOString(),
        totalDays: challenge.totalDays,
        checkinDays,
        completionRate,
        totalDuration,
        achievement: getAchievement(completionRate, checkinDays),
      };
      db.data.certificates.push(cert);
      await db.write();
    } else {
      cert.checkinDays = checkinDays;
      cert.completionRate = completionRate;
      cert.totalDuration = totalDuration;
      cert.achievement = getAchievement(completionRate, checkinDays);
      await db.write();
    }

    return { success: true, data: cert };
  }

  static async getByMember(memberId: string): Promise<ApiResponse<CertificateData[]>> {
    await db.read();
    const certs = db.data.certificates.filter((c) => c.memberId === memberId);
    return { success: true, data: certs };
  }
}

export default CertificateService;

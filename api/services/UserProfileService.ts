import db from '../db/index';
import type { User, ApiResponse, PersonalAchievements, Gender } from '../../shared/types';

export interface UpdateProfileInput {
  nickname?: string;
  signature?: string;
  gender?: Gender;
  birthday?: string;
  avatar?: string;
  name?: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export class UserProfileService {
  static async updateProfile(
    userId: string,
    data: UpdateProfileInput
  ): Promise<ApiResponse<Omit<User, 'password'>>> {
    await db.read();
    const user = db.data.users.find((u) => u.id === userId);
    if (!user) {
      return {
        success: false,
        error: { code: 'USER_NOT_FOUND', message: '用户不存在' },
      };
    }

    if (data.nickname !== undefined) user.nickname = data.nickname;
    if (data.signature !== undefined) user.signature = data.signature;
    if (data.gender !== undefined) user.gender = data.gender;
    if (data.birthday !== undefined) user.birthday = data.birthday;
    if (data.avatar !== undefined) user.avatar = data.avatar;
    if (data.name !== undefined) user.name = data.name;

    await db.write();
    const { password: _p, ...safeUser } = user;
    return { success: true, data: safeUser };
  }

  static async changePassword(
    userId: string,
    data: ChangePasswordInput
  ): Promise<ApiResponse<null>> {
    await db.read();
    const user = db.data.users.find((u) => u.id === userId);
    if (!user) {
      return {
        success: false,
        error: { code: 'USER_NOT_FOUND', message: '用户不存在' },
      };
    }

    if (user.password !== data.oldPassword) {
      return {
        success: false,
        error: { code: 'WRONG_PASSWORD', message: '原密码错误' },
      };
    }

    if (data.newPassword.length < 6) {
      return {
        success: false,
        error: { code: 'PASSWORD_TOO_SHORT', message: '新密码长度不能少于6位' },
      };
    }

    user.password = data.newPassword;
    await db.write();
    return { success: true, data: null };
  }

  static async getPersonalAchievements(
    memberId: string
  ): Promise<ApiResponse<PersonalAchievements>> {
    await db.read();

    const userCheckins = db.data.checkins.filter((c) => c.memberId === memberId);
    const uniqueCheckinDates = new Set(userCheckins.map((c) => c.date));
    const totalCheckinDays = uniqueCheckinDates.size;

    const totalDuration = userCheckins.reduce((sum, c) => sum + c.duration, 0);

    const sortedDates = Array.from(uniqueCheckinDates).sort();
    let longestConsecutiveDays = 0;
    let currentStreak = 0;
    let prevDate: Date | null = null;

    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      if (prevDate) {
        const diffDays = Math.floor(
          (date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      longestConsecutiveDays = Math.max(longestConsecutiveDays, currentStreak);
      prevDate = date;
    }

    const completedChallenges = db.data.challenges.filter(
      (c) => c.status === 'ended' && c.memberIds.includes(memberId)
    ).length;

    const earnedCertificates = db.data.certificates.filter(
      (c) => c.memberId === memberId
    ).length;

    const userPoints = db.data.userPoints.find((p) => p.memberId === memberId);
    const totalPoints = userPoints?.totalPoints || 0;

    return {
      success: true,
      data: {
        totalCheckinDays,
        longestConsecutiveDays,
        completedChallenges,
        earnedCertificates,
        totalPoints,
        totalDuration,
      },
    };
  }
}

export default UserProfileService;

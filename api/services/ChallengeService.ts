import db from '../db/index';
import type { Challenge, ChallengeType, ChallengeStatus, ApiResponse } from '../../shared/types';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function calcStatus(start: string, end: string): ChallengeStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  if (today < s) return 'upcoming';
  if (today > e) return 'ended';
  return 'active';
}

export interface CreateChallengeInput {
  name: string;
  type: ChallengeType;
  description: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  target: {
    minDurationPerDay: number;
    extraField?: Challenge['target']['extraField'];
  };
  coverImage?: string;
  createdBy: string;
}

export class ChallengeService {
  static async getAll(userId?: string): Promise<ApiResponse<Challenge[]>> {
    await db.read();
    let challenges = [...db.data.challenges];
    challenges = challenges.map((c) => ({ ...c, status: calcStatus(c.startDate, c.endDate) }));
    if (userId) {
      const user = db.data.users.find((u) => u.id === userId);
      if (user && user.role === 'member') {
        challenges = challenges.filter((c) => c.memberIds.includes(userId) || c.status === 'active');
      }
    }
    return { success: true, data: challenges.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
  }

  static async getById(id: string): Promise<ApiResponse<Challenge>> {
    await db.read();
    const challenge = db.data.challenges.find((c) => c.id === id);
    if (!challenge) {
      return { success: false, error: { code: 'CHALLENGE_NOT_FOUND', message: '挑战不存在' } };
    }
    return { success: true, data: { ...challenge, status: calcStatus(challenge.startDate, challenge.endDate) } };
  }

  static async create(input: CreateChallengeInput): Promise<ApiResponse<Challenge>> {
    await db.read();
    const id = `chal_${String(Date.now()).slice(-6)}`;
    let joinCode = generateJoinCode();
    while (db.data.challenges.some((c) => c.joinCode === joinCode)) {
      joinCode = generateJoinCode();
    }
    const challenge: Challenge = {
      ...input,
      id,
      joinCode,
      createdAt: new Date().toISOString(),
      status: calcStatus(input.startDate, input.endDate),
      memberIds: [],
    };
    db.data.challenges.push(challenge);
    await db.write();
    return { success: true, data: challenge };
  }

  static async update(id: string, input: Partial<CreateChallengeInput>): Promise<ApiResponse<Challenge>> {
    await db.read();
    const idx = db.data.challenges.findIndex((c) => c.id === id);
    if (idx === -1) {
      return { success: false, error: { code: 'CHALLENGE_NOT_FOUND', message: '挑战不存在' } };
    }
    db.data.challenges[idx] = { ...db.data.challenges[idx], ...input };
    if (input.startDate || input.endDate) {
      db.data.challenges[idx].status = calcStatus(
        input.startDate || db.data.challenges[idx].startDate,
        input.endDate || db.data.challenges[idx].endDate
      );
    }
    await db.write();
    return { success: true, data: db.data.challenges[idx] };
  }

  static async joinByCode(challengeId: string, memberId: string): Promise<ApiResponse<Challenge>> {
    await db.read();
    const challenge = db.data.challenges.find((c) => c.id === challengeId);
    if (!challenge) {
      return { success: false, error: { code: 'CHALLENGE_NOT_FOUND', message: '挑战不存在' } };
    }
    if (!challenge.memberIds.includes(memberId)) {
      challenge.memberIds.push(memberId);
      await db.write();
    }
    return { success: true, data: challenge };
  }

  static async joinChallenge(id: string, memberId: string): Promise<ApiResponse<Challenge>> {
    return ChallengeService.joinByCode(id, memberId);
  }
}

export default ChallengeService;

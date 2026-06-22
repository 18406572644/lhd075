import db from '../db/index';
import type { User, ApiResponse } from '../../shared/types';

export interface LoginResult {
  user: Omit<User, 'password'>;
  token: string;
}

export class AuthService {
  static async login(username: string, password: string, joinCode?: string): Promise<ApiResponse<LoginResult>> {
    await db.read();
    const user = db.data.users.find(
      (u) => u.username === username && u.password === password
    );
    if (!user) {
      return {
        success: false,
        error: { code: 'AUTH_INVALID', message: '用户名或密码错误' },
      };
    }
    if (joinCode && user.role === 'member') {
      const challenge = db.data.challenges.find((c) => c.joinCode === joinCode.toUpperCase());
      if (challenge && !challenge.memberIds.includes(user.id)) {
        challenge.memberIds.push(user.id);
        await db.write();
      }
    }
    const { password: _p, ...safeUser } = user;
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    return { success: true, data: { user: safeUser, token } };
  }

  static async getUsers(): Promise<ApiResponse<Omit<User, 'password'>[]>> {
    await db.read();
    const users = db.data.users.map(({ password: _p, ...rest }) => rest);
    return { success: true, data: users };
  }

  static async getUserById(id: string): Promise<ApiResponse<Omit<User, 'password'>>> {
    await db.read();
    const user = db.data.users.find((u) => u.id === id);
    if (!user) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: '用户不存在' } };
    }
    const { password: _p, ...safeUser } = user;
    return { success: true, data: safeUser };
  }
}

export default AuthService;

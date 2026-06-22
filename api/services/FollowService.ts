import db from '../db/index';
import type { ApiResponse, Follow, CheckinWithRelations } from '../../shared/types';
import NotificationService from './NotificationService';

export class FollowService {
  static async follow(followerId: string, followingId: string): Promise<ApiResponse<{ followed: boolean; isMutual: boolean }>> {
    if (followerId === followingId) {
      return { success: false, error: { code: 'CANNOT_FOLLOW_SELF', message: '不能关注自己' } };
    }
    await db.read();

    const target = db.data.users.find((u) => u.id === followingId);
    if (!target) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: '用户不存在' } };
    }

    const existing = db.data.follows.find(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
    if (existing) {
      return { success: false, error: { code: 'ALREADY_FOLLOWING', message: '已经关注该用户' } };
    }

    const follow: Follow = {
      id: `foll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      followerId,
      followingId,
      createdAt: new Date().toISOString(),
    };
    db.data.follows.push(follow);
    await db.write();

    const isMutual = db.data.follows.some(
      (f) => f.followerId === followingId && f.followingId === followerId
    );

    const follower = db.data.users.find((u) => u.id === followerId);
    NotificationService.create({
      memberId: followingId,
      type: 'interaction',
      title: `${follower?.nickname || follower?.name || '有人'} 关注了你`,
      content: `${follower?.nickname || follower?.name || '有人'} 关注了您，快来看看TA的主页吧~`,
      relatedId: followerId,
      relatedType: 'user',
    }).catch(() => {});

    return { success: true, data: { followed: true, isMutual } };
  }

  static async unfollow(followerId: string, followingId: string): Promise<ApiResponse<{ unfollowed: boolean }>> {
    await db.read();
    const idx = db.data.follows.findIndex(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOLLOWING', message: '未关注该用户' } };
    }
    db.data.follows.splice(idx, 1);
    await db.write();
    return { success: true, data: { unfollowed: true } };
  }

  static async isFollowing(followerId: string, followingId: string): Promise<ApiResponse<{ isFollowing: boolean; isMutual: boolean }>> {
    await db.read();
    const isFollowing = db.data.follows.some(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
    const isMutual = isFollowing && db.data.follows.some(
      (f) => f.followerId === followingId && f.followingId === followerId
    );
    return { success: true, data: { isFollowing, isMutual } };
  }

  static async getFollowing(userId: string, currentUserId?: string): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    nickname?: string;
    avatar?: string;
    signature?: string;
    isMutual: boolean;
    checkinCount: number;
    followersCount: number;
    followingCount: number;
  }>>> {
    await db.read();
    const following = db.data.follows.filter((f) => f.followerId === userId);
    const userIds = following.map((f) => f.followingId);

    const result = [];
    for (const fid of userIds) {
      const user = db.data.users.find((u) => u.id === fid);
      if (!user) continue;

      const checkinCount = db.data.checkins.filter((c) => c.memberId === fid && !c.isDeleted).length;
      const followersCount = db.data.follows.filter((f) => f.followingId === fid).length;
      const followingCount = db.data.follows.filter((f) => f.followerId === fid).length;
      const isMutual = currentUserId
        ? db.data.follows.some(
            (f) => f.followerId === currentUserId && f.followingId === fid
          ) && db.data.follows.some(
            (f) => f.followerId === fid && f.followingId === currentUserId
          )
        : false;

      result.push({
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        avatar: user.avatar,
        signature: user.signature,
        isMutual,
        checkinCount,
        followersCount,
        followingCount,
      });
    }

    result.sort((a, b) => {
      const fa = following.find((f) => f.followingId === a.id)!;
      const fb = following.find((f) => f.followingId === b.id)!;
      return fb.createdAt.localeCompare(fa.createdAt);
    });

    return { success: true, data: result };
  }

  static async getFollowers(userId: string, currentUserId?: string): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    nickname?: string;
    avatar?: string;
    signature?: string;
    isFollowing: boolean;
    isMutual: boolean;
    checkinCount: number;
    followersCount: number;
    followingCount: number;
  }>>> {
    await db.read();
    const followers = db.data.follows.filter((f) => f.followingId === userId);
    const userIds = followers.map((f) => f.followerId);

    const result = [];
    for (const fid of userIds) {
      const user = db.data.users.find((u) => u.id === fid);
      if (!user) continue;

      const checkinCount = db.data.checkins.filter((c) => c.memberId === fid && !c.isDeleted).length;
      const followersCount = db.data.follows.filter((f) => f.followingId === fid).length;
      const followingCount = db.data.follows.filter((f) => f.followerId === fid).length;
      const isFollowing = currentUserId
        ? db.data.follows.some(
            (f) => f.followerId === currentUserId && f.followingId === fid
          )
        : false;
      const isMutual = currentUserId
        ? db.data.follows.some(
            (f) => f.followerId === userId && f.followingId === fid
          )
        : false;

      result.push({
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        avatar: user.avatar,
        signature: user.signature,
        isFollowing,
        isMutual,
        checkinCount,
        followersCount,
        followingCount,
      });
    }

    result.sort((a, b) => {
      const fa = followers.find((f) => f.followerId === a.id)!;
      const fb = followers.find((f) => f.followerId === b.id)!;
      return fb.createdAt.localeCompare(fa.createdAt);
    });

    return { success: true, data: result };
  }

  static async getFriendCount(userId: string): Promise<ApiResponse<{ followers: number; following: number }>> {
    await db.read();
    const followers = db.data.follows.filter((f) => f.followingId === userId).length;
    const following = db.data.follows.filter((f) => f.followerId === userId).length;
    return { success: true, data: { followers, following } };
  }

  static async getFollowingFeed(userId: string, page: number = 1, pageSize: number = 20): Promise<ApiResponse<{
    items: CheckinWithRelations[];
    total: number;
    hasMore: boolean;
  }>> {
    await db.read();
    const followingIds = db.data.follows
      .filter((f) => f.followerId === userId)
      .map((f) => f.followingId);

    if (followingIds.length === 0) {
      return { success: true, data: { items: [], total: 0, hasMore: false } };
    }

    let checkins = db.data.checkins
      .filter((c) => followingIds.includes(c.memberId) && !c.isDeleted && c.status !== 'hidden')
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    const total = checkins.length;
    const start = (page - 1) * pageSize;
    checkins = checkins.slice(start, start + pageSize);

    const items: CheckinWithRelations[] = [];
    for (const c of checkins) {
      const user = db.data.users.find((u) => u.id === c.memberId);
      const challenge = db.data.challenges.find((ch) => ch.id === c.challengeId);
      const likeCount = db.data.checkinLikes.filter((l) => l.checkinId === c.id).length;
      const commentCount = db.data.comments.filter((cm) => cm.checkinId === c.id && !cm.isDeleted).length;
      const isLiked = db.data.checkinLikes.some((l) => l.checkinId === c.id && l.memberId === userId);
      items.push({
        ...c,
        member: user ? { id: user.id, name: user.name, nickname: user.nickname, avatar: user.avatar } : undefined,
        challenge: challenge ? { id: challenge.id, name: challenge.name } : undefined,
        likeCount,
        commentCount,
        isLiked,
        isFollowed: true,
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

  static async getSuggestedUsers(userId: string, limit: number = 10): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    nickname?: string;
    avatar?: string;
    signature?: string;
    checkinCount: number;
    followersCount: number;
    commonFollowing: number;
  }>>> {
    await db.read();
    const followingIds = db.data.follows
      .filter((f) => f.followerId === userId)
      .map((f) => f.followingId);

    const userFollowingMap: Record<string, string[]> = {};
    for (const f of db.data.follows) {
      if (!userFollowingMap[f.followerId]) {
        userFollowingMap[f.followerId] = [];
      }
      userFollowingMap[f.followerId].push(f.followingId);
    }

    const suggested = db.data.users
      .filter((u) => u.id !== userId && u.role === 'member' && !followingIds.includes(u.id))
      .map((u) => {
        const checkinCount = db.data.checkins.filter((c) => c.memberId === u.id && !c.isDeleted).length;
        const followersCount = db.data.follows.filter((f) => f.followingId === u.id).length;
        const myFollowing = userFollowingMap[userId] || [];
        const theirFollowers = db.data.follows.filter((f) => f.followingId === u.id).map((f) => f.followerId);
        const commonFollowing = myFollowing.filter((id) => theirFollowers.includes(id)).length;

        return {
          id: u.id,
          name: u.name,
          nickname: u.nickname,
          avatar: u.avatar,
          signature: u.signature,
          checkinCount,
          followersCount,
          commonFollowing,
        };
      })
      .sort((a, b) => {
        const diff = b.commonFollowing - a.commonFollowing;
        if (diff !== 0) return diff;
        return b.checkinCount - a.checkinCount;
      })
      .slice(0, limit);

    return { success: true, data: suggested };
  }
}

export default FollowService;

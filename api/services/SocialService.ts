import db from '../db/index';
import type {
  ApiResponse,
  CheckinLike,
  CommentLike,
  Comment,
  CommentMention,
  CommentWithRelations,
  SensitiveWord,
  ContentReport,
} from '../../shared/types';
import NotificationService from './NotificationService';

export class SocialService {
  static async filterSensitiveWords(content: string): Promise<{ filtered: string; hasSensitive: boolean; matchedWords: string[] }> {
    await db.read();
    const sensitiveWords = db.data.sensitiveWords || [];
    const matchedWords: string[] = [];
    let filtered = content;

    for (const sw of sensitiveWords) {
      if (filtered.includes(sw.word)) {
        matchedWords.push(sw.word);
        const mask = '*'.repeat(sw.word.length);
        filtered = filtered.split(sw.word).join(mask);
      }
    }

    return { filtered, hasSensitive: matchedWords.length > 0, matchedWords };
  }

  static async checkContentForSensitive(content: string): Promise<{ hasSensitive: boolean; matchedWords: string[] }> {
    await db.read();
    const sensitiveWords = db.data.sensitiveWords || [];
    const matchedWords: string[] = [];

    for (const sw of sensitiveWords) {
      if (content.includes(sw.word)) {
        matchedWords.push(sw.word);
      }
    }

    return { hasSensitive: matchedWords.length > 0, matchedWords };
  }

  static parseMentions(content: string): { cleanContent: string; mentions: CommentMention[] } {
    const mentions: CommentMention[] = [];
    const mentionRegex = /@(\S+)/g;
    let match;
    let offset = 0;
    const cleanParts: string[] = [];
    let lastIndex = 0;

    while ((match = mentionRegex.exec(content)) !== null) {
      cleanParts.push(content.slice(lastIndex, match.index));
      const mentionText = match[0];
      const mentionName = match[1];
      mentions.push({
        memberId: '',
        memberName: mentionName,
        startIndex: match.index - offset,
        endIndex: match.index + mentionText.length - offset,
      });
      cleanParts.push(mentionText);
      lastIndex = mentionRegex.lastIndex;
    }
    cleanParts.push(content.slice(lastIndex));

    return { cleanContent: cleanParts.join(''), mentions };
  }

  static async resolveMemberIdsForMentions(mentions: CommentMention[]): Promise<CommentMention[]> {
    await db.read();
    return mentions.map((m) => {
      const user = db.data.users.find(
        (u) => u.nickname === m.memberName || u.name === m.memberName || u.username === m.memberName
      );
      if (user) {
        return { ...m, memberId: user.id };
      }
      return m;
    });
  }

  static async toggleCheckinLike(checkinId: string, memberId: string): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> {
    await db.read();

    const checkin = db.data.checkins.find((c) => c.id === checkinId && !c.isDeleted);
    if (!checkin) {
      return { success: false, error: { code: 'CHECKIN_NOT_FOUND', message: '打卡记录不存在' } };
    }

    const existingLike = db.data.checkinLikes.find(
      (l) => l.checkinId === checkinId && l.memberId === memberId
    );

    if (existingLike) {
      const idx = db.data.checkinLikes.indexOf(existingLike);
      db.data.checkinLikes.splice(idx, 1);
      await db.write();

      const likeCount = db.data.checkinLikes.filter((l) => l.checkinId === checkinId).length;
      return { success: true, data: { liked: false, likeCount } };
    }

    const newLike: CheckinLike = {
      id: `like_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      checkinId,
      memberId,
      createdAt: new Date().toISOString(),
    };
    db.data.checkinLikes.push(newLike);
    await db.write();

    if (checkin.memberId !== memberId) {
      const user = db.data.users.find((u) => u.id === memberId);
      NotificationService.create({
        memberId: checkin.memberId,
        type: 'interaction',
        title: `${user?.nickname || user?.name || '有人'} 点赞了你的打卡`,
        content: `${user?.nickname || user?.name || '有人'} 觉得你的运动打卡很棒，给你点了一个赞！`,
        relatedId: checkinId,
        relatedType: 'checkin',
      }).catch(() => {});
    }

    const likeCount = db.data.checkinLikes.filter((l) => l.checkinId === checkinId).length;
    return { success: true, data: { liked: true, likeCount } };
  }

  static async getCheckinLikes(checkinId: string): Promise<ApiResponse<{ likes: { memberId: string; memberName: string; nickname?: string; avatar?: string; createdAt: string }[]; count: number }>> {
    await db.read();

    const likes = db.data.checkinLikes.filter((l) => l.checkinId === checkinId);
    const enriched = likes.map((l) => {
      const user = db.data.users.find((u) => u.id === l.memberId);
      return {
        memberId: l.memberId,
        memberName: user?.name || '',
        nickname: user?.nickname,
        avatar: user?.avatar,
        createdAt: l.createdAt,
      };
    });

    return { success: true, data: { likes: enriched, count: enriched.length } };
  }

  static async createComment(params: {
    checkinId: string;
    memberId: string;
    content: string;
    parentId?: string;
    replyToMemberId?: string;
  }): Promise<ApiResponse<CommentWithRelations>> {
    await db.read();

    const checkin = db.data.checkins.find((c) => c.id === params.checkinId && !c.isDeleted);
    if (!checkin) {
      return { success: false, error: { code: 'CHECKIN_NOT_FOUND', message: '打卡记录不存在' } };
    }

    if (params.parentId) {
      const parent = db.data.comments.find((c) => c.id === params.parentId && !c.isDeleted);
      if (!parent) {
        return { success: false, error: { code: 'PARENT_COMMENT_NOT_FOUND', message: '父评论不存在' } };
      }
    }

    const { cleanContent, mentions: rawMentions } = this.parseMentions(params.content);
    const { filtered, hasSensitive, matchedWords } = await this.filterSensitiveWords(cleanContent);
    const mentions = await this.resolveMemberIdsForMentions(rawMentions);

    const newId = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const comment: Comment = {
      id: newId,
      checkinId: params.checkinId,
      memberId: params.memberId,
      parentId: params.parentId,
      replyToMemberId: params.replyToMemberId,
      content: filtered,
      mentions,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    db.data.comments.push(comment);
    await db.write();

    const commenter = db.data.users.find((u) => u.id === params.memberId);

    if (checkin.memberId !== params.memberId) {
      NotificationService.create({
        memberId: checkin.memberId,
        type: 'interaction',
        title: `${commenter?.nickname || commenter?.name || '有人'} 评论了你的打卡`,
        content: `${commenter?.nickname || commenter?.name || '有人'} 评论道：「${filtered.slice(0, 50)}${filtered.length > 50 ? '...' : ''}」`,
        relatedId: params.checkinId,
        relatedType: 'checkin',
      }).catch(() => {});
    }

    if (params.replyToMemberId && params.replyToMemberId !== params.memberId) {
      NotificationService.create({
        memberId: params.replyToMemberId,
        type: 'interaction',
        title: `${commenter?.nickname || commenter?.name || '有人'} 回复了你的评论`,
        content: `${commenter?.nickname || commenter?.name || '有人'} 回复：「${filtered.slice(0, 50)}${filtered.length > 50 ? '...' : ''}」`,
        relatedId: newId,
        relatedType: 'comment',
      }).catch(() => {});
    }

    for (const mention of mentions) {
      if (mention.memberId && mention.memberId !== params.memberId && mention.memberId !== checkin.memberId) {
        NotificationService.create({
          memberId: mention.memberId,
          type: 'interaction',
          title: `${commenter?.nickname || commenter?.name || '有人'} 在评论中@了你`,
          content: `${commenter?.nickname || commenter?.name || '有人'} 在打卡评论中提到了你：「${filtered.slice(0, 50)}${filtered.length > 50 ? '...' : ''}」`,
          relatedId: newId,
          relatedType: 'comment',
        }).catch(() => {});
      }
    }

    const result = await this._enrichComment(comment, params.memberId);

    if (hasSensitive && result.data) {
      result.data.content = filtered;
      (result.data as any)._sensitiveWarning = {
        matched: matchedWords,
        message: `内容包含敏感词：${matchedWords.join('、')}，已自动过滤`,
      };
    }

    return result;
  }

  static async toggleCommentLike(commentId: string, memberId: string): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> {
    await db.read();

    const comment = db.data.comments.find((c) => c.id === commentId && !c.isDeleted);
    if (!comment) {
      return { success: false, error: { code: 'COMMENT_NOT_FOUND', message: '评论不存在' } };
    }

    const existingLike = db.data.commentLikes.find(
      (l) => l.commentId === commentId && l.memberId === memberId
    );

    if (existingLike) {
      const idx = db.data.commentLikes.indexOf(existingLike);
      db.data.commentLikes.splice(idx, 1);
      await db.write();

      const likeCount = db.data.commentLikes.filter((l) => l.commentId === commentId).length;
      return { success: true, data: { liked: false, likeCount } };
    }

    const newLike: CommentLike = {
      id: `clike_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      commentId,
      memberId,
      createdAt: new Date().toISOString(),
    };
    db.data.commentLikes.push(newLike);
    await db.write();

    if (comment.memberId !== memberId) {
      const user = db.data.users.find((u) => u.id === memberId);
      NotificationService.create({
        memberId: comment.memberId,
        type: 'interaction',
        title: `${user?.nickname || user?.name || '有人'} 点赞了你的评论`,
        content: `${user?.nickname || user?.name || '有人'} 点赞了你的评论：「${comment.content.slice(0, 30)}...」`,
        relatedId: commentId,
        relatedType: 'comment',
      }).catch(() => {});
    }

    const likeCount = db.data.commentLikes.filter((l) => l.commentId === commentId).length;
    return { success: true, data: { liked: true, likeCount } };
  }

  static async getCheckinComments(checkinId: string, currentMemberId?: string): Promise<ApiResponse<CommentWithRelations[]>> {
    await db.read();

    const topLevelComments = db.data.comments
      .filter((c) => c.checkinId === checkinId && !c.parentId && !c.isDeleted)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const result: CommentWithRelations[] = [];
    for (const c of topLevelComments) {
      const enriched = await this._enrichComment(c, currentMemberId);
      if (enriched.success && enriched.data) {
        const replies = db.data.comments
          .filter((r) => r.parentId === c.id && !r.isDeleted)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const replyEnriched: CommentWithRelations[] = [];
        for (const r of replies) {
          const re = await this._enrichComment(r, currentMemberId);
          if (re.success && re.data) replyEnriched.push(re.data);
        }
        enriched.data.replies = replyEnriched;
        enriched.data.replyCount = replyEnriched.length;
        result.push(enriched.data);
      }
    }

    return { success: true, data: result };
  }

  private static async _enrichComment(comment: Comment, currentMemberId?: string): Promise<ApiResponse<CommentWithRelations>> {
    await db.read();
    const member = db.data.users.find((u) => u.id === comment.memberId);
    const replyToMember = comment.replyToMemberId
      ? db.data.users.find((u) => u.id === comment.replyToMemberId)
      : undefined;
    const likeCount = db.data.commentLikes.filter((l) => l.commentId === comment.id).length;
    const isLiked = currentMemberId
      ? db.data.commentLikes.some((l) => l.commentId === comment.id && l.memberId === currentMemberId)
      : false;

    const data: CommentWithRelations = {
      ...comment,
      member: member
        ? { id: member.id, name: member.name, nickname: member.nickname, avatar: member.avatar }
        : undefined,
      replyToMember: replyToMember
        ? { id: replyToMember.id, name: replyToMember.name, nickname: replyToMember.nickname, avatar: replyToMember.avatar }
        : undefined,
      likeCount,
      isLiked,
      replies: [],
      replyCount: 0,
    };

    return { success: true, data };
  }

  static async deleteComment(commentId: string, memberId: string, userRole: string): Promise<ApiResponse<{ deleted: boolean }>> {
    await db.read();

    const comment = db.data.comments.find((c) => c.id === commentId);
    if (!comment || comment.isDeleted) {
      return { success: false, error: { code: 'COMMENT_NOT_FOUND', message: '评论不存在' } };
    }

    if (comment.memberId !== memberId && userRole !== 'admin') {
      return { success: false, error: { code: 'PERMISSION_DENIED', message: '无权限删除该评论' } };
    }

    comment.isDeleted = true;
    comment.deletedAt = new Date().toISOString();
    comment.deletedBy = userRole === 'admin' ? 'admin' : memberId;
    comment.content = '[该评论已删除]';
    comment.mentions = [];
    await db.write();

    return { success: true, data: { deleted: true } };
  }

  static async getSensitiveWords(category?: string): Promise<ApiResponse<SensitiveWord[]>> {
    await db.read();
    let words = [...db.data.sensitiveWords];
    if (category) {
      words = words.filter((w) => w.category === category);
    }
    words.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { success: true, data: words };
  }

  static async addSensitiveWord(params: { word: string; category: SensitiveWord['category']; createdBy: string }): Promise<ApiResponse<SensitiveWord>> {
    await db.read();

    const existing = db.data.sensitiveWords.find((w) => w.word === params.word);
    if (existing) {
      return { success: false, error: { code: 'WORD_EXISTS', message: '该敏感词已存在' } };
    }

    const newWord: SensitiveWord = {
      id: `sw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      word: params.word,
      category: params.category,
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy,
    };
    db.data.sensitiveWords.push(newWord);
    await db.write();

    return { success: true, data: newWord };
  }

  static async removeSensitiveWord(id: string): Promise<ApiResponse<{ removed: boolean }>> {
    await db.read();
    const idx = db.data.sensitiveWords.findIndex((w) => w.id === id);
    if (idx === -1) {
      return { success: false, error: { code: 'WORD_NOT_FOUND', message: '敏感词不存在' } };
    }
    db.data.sensitiveWords.splice(idx, 1);
    await db.write();
    return { success: true, data: { removed: true } };
  }

  static async reportContent(params: {
    targetType: 'checkin' | 'comment';
    targetId: string;
    reporterId: string;
    reason: string;
    description?: string;
  }): Promise<ApiResponse<ContentReport>> {
    await db.read();

    if (params.targetType === 'checkin') {
      const c = db.data.checkins.find((x) => x.id === params.targetId);
      if (!c) return { success: false, error: { code: 'NOT_FOUND', message: '打卡不存在' } };
    } else {
      const c = db.data.comments.find((x) => x.id === params.targetId);
      if (!c) return { success: false, error: { code: 'NOT_FOUND', message: '评论不存在' } };
    }

    const report: ContentReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      targetType: params.targetType,
      targetId: params.targetId,
      reporterId: params.reporterId,
      reason: params.reason,
      description: params.description,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.data.contentReports.push(report);
    await db.write();
    return { success: true, data: report };
  }

  static async getReports(status?: 'pending' | 'resolved' | 'rejected'): Promise<ApiResponse<Array<ContentReport & { target?: any }>>> {
    await db.read();
    let reports = [...db.data.contentReports];
    if (status) reports = reports.filter((r) => r.status === status);
    reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const enriched = reports.map((r) => {
      let target: any = null;
      if (r.targetType === 'checkin') {
        target = db.data.checkins.find((c) => c.id === r.targetId);
      } else {
        target = db.data.comments.find((c) => c.id === r.targetId);
      }
      const reporter = db.data.users.find((u) => u.id === r.reporterId);
      return {
        ...r,
        target,
        reporter: reporter ? { id: reporter.id, name: reporter.name, nickname: reporter.nickname, avatar: reporter.avatar } : null,
      };
    });

    return { success: true, data: enriched };
  }

  static async resolveReport(
    reportId: string,
    adminId: string,
    status: 'resolved' | 'rejected',
    resolution: string,
    deleteContent?: boolean
  ): Promise<ApiResponse<{ resolved: boolean }>> {
    await db.read();
    const report = db.data.contentReports.find((r) => r.id === reportId);
    if (!report) return { success: false, error: { code: 'REPORT_NOT_FOUND', message: '举报不存在' } };

    report.status = status;
    report.resolvedAt = new Date().toISOString();
    report.resolvedBy = adminId;
    report.resolution = resolution;

    if (deleteContent && status === 'resolved') {
      if (report.targetType === 'checkin') {
        const c = db.data.checkins.find((x) => x.id === report.targetId);
        if (c) {
          c.isDeleted = true;
          c.deletedAt = new Date().toISOString();
          c.deletedBy = adminId;
          c.status = 'hidden';
        }
      } else {
        const c = db.data.comments.find((x) => x.id === report.targetId);
        if (c) {
          c.isDeleted = true;
          c.deletedAt = new Date().toISOString();
          c.deletedBy = adminId;
          c.content = '[该内容已被管理员删除]';
          c.mentions = [];
        }
      }
    }

    await db.write();
    return { success: true, data: { resolved: true } };
  }

  static async deleteCheckinByAdmin(checkinId: string, adminId: string, reason: string): Promise<ApiResponse<{ deleted: boolean }>> {
    await db.read();
    const c = db.data.checkins.find((x) => x.id === checkinId);
    if (!c) return { success: false, error: { code: 'NOT_FOUND', message: '打卡不存在' } };

    c.isDeleted = true;
    c.deletedAt = new Date().toISOString();
    c.deletedBy = adminId;
    c.status = 'hidden';
    await db.write();

    NotificationService.create({
      memberId: c.memberId,
      type: 'system_announcement',
      title: '您的打卡内容已被处理',
      content: `您的打卡内容因「${reason}」违反社区规范，已被管理员删除。如有疑问请联系客服。`,
      relatedId: checkinId,
      relatedType: 'checkin',
    }).catch(() => {});

    return { success: true, data: { deleted: true } };
  }
}

export default SocialService;

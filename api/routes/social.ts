import { Router } from 'express';
import SocialService from '../services/SocialService';

const router = Router();

router.post('/checkins/:checkinId/like', async (req, res) => {
  const { checkinId } = req.params;
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ success: false, error: { code: 'MEMBER_ID_REQUIRED', message: 'memberId 是必填项' } });
  const result = await SocialService.toggleCheckinLike(checkinId, memberId);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

router.get('/checkins/:checkinId/likes', async (req, res) => {
  const { checkinId } = req.params;
  const result = await SocialService.getCheckinLikes(checkinId);
  return res.json(result);
});

router.post('/checkins/:checkinId/comments', async (req, res) => {
  const { checkinId } = req.params;
  const { memberId, content, parentId, replyToMemberId } = req.body;
  if (!memberId || !content) {
    return res.status(400).json({ success: false, error: { code: 'REQUIRED_FIELDS', message: 'memberId 和 content 是必填项' } });
  }
  if (content.trim().length === 0) {
    return res.status(400).json({ success: false, error: { code: 'EMPTY_CONTENT', message: '评论内容不能为空' } });
  }
  const result = await SocialService.createComment({ checkinId, memberId, content, parentId, replyToMemberId });
  if (!result.success) {
    if (result.error?.code === 'CHECKIN_NOT_FOUND' || result.error?.code === 'PARENT_COMMENT_NOT_FOUND') {
      return res.status(404).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.get('/checkins/:checkinId/comments', async (req, res) => {
  const { checkinId } = req.params;
  const memberId = req.query.memberId as string | undefined;
  const result = await SocialService.getCheckinComments(checkinId, memberId);
  return res.json(result);
});

router.post('/comments/:commentId/like', async (req, res) => {
  const { commentId } = req.params;
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ success: false, error: { code: 'MEMBER_ID_REQUIRED', message: 'memberId 是必填项' } });
  const result = await SocialService.toggleCommentLike(commentId, memberId);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

router.delete('/comments/:commentId', async (req, res) => {
  const { commentId } = req.params;
  const { memberId, userRole } = req.body;
  if (!memberId) return res.status(400).json({ success: false, error: { code: 'MEMBER_ID_REQUIRED', message: 'memberId 是必填项' } });
  const result = await SocialService.deleteComment(commentId, memberId, userRole || 'member');
  if (!result.success) {
    if (result.error?.code === 'COMMENT_NOT_FOUND') return res.status(404).json(result);
    if (result.error?.code === 'PERMISSION_DENIED') return res.status(403).json(result);
    return res.status(400).json(result);
  }
  return res.json(result);
});

router.post('/report', async (req, res) => {
  const { targetType, targetId, reporterId, reason, description } = req.body;
  if (!targetType || !targetId || !reporterId || !reason) {
    return res.status(400).json({ success: false, error: { code: 'REQUIRED_FIELDS', message: 'targetType、targetId、reporterId、reason 是必填项' } });
  }
  const result = await SocialService.reportContent({ targetType, targetId, reporterId, reason, description });
  if (!result.success) return res.status(404).json(result);
  return res.status(201).json(result);
});

export default router;

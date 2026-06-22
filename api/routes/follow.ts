import { Router } from 'express';
import FollowService from '../services/FollowService';

const router = Router();

router.post('/follow', async (req, res) => {
  const { followerId, followingId } = req.body;
  if (!followerId || !followingId) {
    return res.status(400).json({ success: false, error: { code: 'REQUIRED_FIELDS', message: 'followerId 和 followingId 是必填项' } });
  }
  const result = await FollowService.follow(followerId, followingId);
  if (!result.success) {
    if (result.error?.code === 'USER_NOT_FOUND') return res.status(404).json(result);
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post('/unfollow', async (req, res) => {
  const { followerId, followingId } = req.body;
  if (!followerId || !followingId) {
    return res.status(400).json({ success: false, error: { code: 'REQUIRED_FIELDS', message: 'followerId 和 followingId 是必填项' } });
  }
  const result = await FollowService.unfollow(followerId, followingId);
  if (!result.success) return res.status(400).json(result);
  return res.json(result);
});

router.get('/status', async (req, res) => {
  const followerId = req.query.followerId as string;
  const followingId = req.query.followingId as string;
  if (!followerId || !followingId) {
    return res.status(400).json({ success: false, error: { code: 'REQUIRED_FIELDS', message: 'followerId 和 followingId 是必填项' } });
  }
  const result = await FollowService.isFollowing(followerId, followingId);
  return res.json(result);
});

router.get('/users/:userId/following', async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.query.currentUserId as string | undefined;
  const result = await FollowService.getFollowing(userId, currentUserId);
  return res.json(result);
});

router.get('/users/:userId/followers', async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.query.currentUserId as string | undefined;
  const result = await FollowService.getFollowers(userId, currentUserId);
  return res.json(result);
});

router.get('/users/:userId/count', async (req, res) => {
  const { userId } = req.params;
  const result = await FollowService.getFriendCount(userId);
  return res.json(result);
});

router.get('/feed', async (req, res) => {
  const userId = req.query.userId as string;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  if (!userId) {
    return res.status(400).json({ success: false, error: { code: 'USER_ID_REQUIRED', message: 'userId 是必填项' } });
  }
  const result = await FollowService.getFollowingFeed(userId, page, pageSize);
  return res.json(result);
});

router.get('/suggested', async (req, res) => {
  const userId = req.query.userId as string;
  const limit = parseInt(req.query.limit as string) || 10;
  if (!userId) {
    return res.status(400).json({ success: false, error: { code: 'USER_ID_REQUIRED', message: 'userId 是必填项' } });
  }
  const result = await FollowService.getSuggestedUsers(userId, limit);
  return res.json(result);
});

export default router;

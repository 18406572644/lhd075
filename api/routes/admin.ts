import { Router } from 'express';
import SocialService from '../services/SocialService';
import db from '../db/index';

const router = Router();

const checkAdmin = async (adminId: string): Promise<boolean> => {
  await db.read();
  const user = db.data.users.find((u) => u.id === adminId);
  return !!user && user.role === 'admin';
};

router.get('/sensitive-words', async (req, res) => {
  const adminId = req.query.adminId as string;
  if (!adminId || !(await checkAdmin(adminId))) {
    return res.status(403).json({ success: false, error: { code: 'ADMIN_REQUIRED', message: '管理员权限不足' } });
  }
  const category = req.query.category as string | undefined;
  const result = await SocialService.getSensitiveWords(category);
  return res.json(result);
});

router.post('/sensitive-words', async (req, res) => {
  const { word, category, adminId } = req.body;
  if (!adminId || !(await checkAdmin(adminId))) {
    return res.status(403).json({ success: false, error: { code: 'ADMIN_REQUIRED', message: '管理员权限不足' } });
  }
  if (!word || !category) {
    return res.status(400).json({ success: false, error: { code: 'REQUIRED_FIELDS', message: 'word 和 category 是必填项' } });
  }
  const validCategories = ['violence', 'pornography', 'politics', 'advertising', 'insult', 'other'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'category 无效' } });
  }
  const result = await SocialService.addSensitiveWord({ word, category, createdBy: adminId });
  if (!result.success) return res.status(400).json(result);
  return res.status(201).json(result);
});

router.delete('/sensitive-words/:id', async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body;
  if (!adminId || !(await checkAdmin(adminId))) {
    return res.status(403).json({ success: false, error: { code: 'ADMIN_REQUIRED', message: '管理员权限不足' } });
  }
  const result = await SocialService.removeSensitiveWord(id);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

router.get('/reports', async (req, res) => {
  const adminId = req.query.adminId as string;
  if (!adminId || !(await checkAdmin(adminId))) {
    return res.status(403).json({ success: false, error: { code: 'ADMIN_REQUIRED', message: '管理员权限不足' } });
  }
  const status = req.query.status as 'pending' | 'resolved' | 'rejected' | undefined;
  const validStatuses = ['pending', 'resolved', 'rejected'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'status 无效' } });
  }
  const result = await SocialService.getReports(status);
  return res.json(result);
});

router.post('/reports/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const { adminId, status, resolution, deleteContent } = req.body;
  if (!adminId || !(await checkAdmin(adminId))) {
    return res.status(403).json({ success: false, error: { code: 'ADMIN_REQUIRED', message: '管理员权限不足' } });
  }
  if (!status || !resolution) {
    return res.status(400).json({ success: false, error: { code: 'REQUIRED_FIELDS', message: 'status 和 resolution 是必填项' } });
  }
  if (status !== 'resolved' && status !== 'rejected') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'status 必须是 resolved 或 rejected' } });
  }
  const result = await SocialService.resolveReport(id, adminId, status, resolution, deleteContent);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

router.delete('/checkins/:checkinId', async (req, res) => {
  const { checkinId } = req.params;
  const { adminId, reason } = req.body;
  if (!adminId || !(await checkAdmin(adminId))) {
    return res.status(403).json({ success: false, error: { code: 'ADMIN_REQUIRED', message: '管理员权限不足' } });
  }
  if (!reason) {
    return res.status(400).json({ success: false, error: { code: 'REQUIRED_FIELDS', message: 'reason 是必填项' } });
  }
  const result = await SocialService.deleteCheckinByAdmin(checkinId, adminId, reason);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

router.get('/stats', async (req, res) => {
  const adminId = req.query.adminId as string;
  if (!adminId || !(await checkAdmin(adminId))) {
    return res.status(403).json({ success: false, error: { code: 'ADMIN_REQUIRED', message: '管理员权限不足' } });
  }
  await db.read();
  const stats = {
    totalUsers: db.data.users.filter((u) => u.role === 'member').length,
    totalCheckins: db.data.checkins.filter((c) => !c.isDeleted).length,
    totalComments: db.data.comments.filter((c) => !c.isDeleted).length,
    totalReports: db.data.contentReports.length,
    pendingReports: db.data.contentReports.filter((r) => r.status === 'pending').length,
    sensitiveWordCount: db.data.sensitiveWords.length,
    totalFollows: db.data.follows.length,
  };
  return res.json({ success: true, data: stats });
});

export default router;

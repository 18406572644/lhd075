import { Router } from 'express';
import NotificationService from '../services/NotificationService';
import type { NotificationType } from '../../shared/types';

const router = Router();

router.get('/user/:memberId', async (req, res) => {
  const params = {
    memberId: req.params.memberId,
    type: req.query.type as NotificationType | undefined,
    read: req.query.read !== undefined ? req.query.read === 'true' : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
  };
  const result = await NotificationService.getNotifications(params);
  return res.json(result);
});

router.get('/user/:memberId/unread-count', async (req, res) => {
  const result = await NotificationService.getUnreadCount(req.params.memberId);
  return res.json(result);
});

router.post('/:notificationId/read', async (req, res) => {
  const { memberId } = req.body;
  if (!memberId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: '缺少必要参数' },
    });
  }
  const result = await NotificationService.markAsRead(memberId, req.params.notificationId);
  if (!result.success) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

router.post('/user/:memberId/read-all', async (req, res) => {
  const result = await NotificationService.markAllAsRead(req.params.memberId);
  return res.json(result);
});

router.delete('/:notificationId', async (req, res) => {
  const { memberId } = req.body;
  if (!memberId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: '缺少必要参数' },
    });
  }
  const result = await NotificationService.deleteNotification(memberId, req.params.notificationId);
  if (!result.success) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

router.post('/', async (req, res) => {
  const { memberId, type, title, content, relatedId, relatedType } = req.body;
  if (!memberId || !type || !title || !content) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: '缺少必要参数' },
    });
  }
  const result = await NotificationService.createNotification({
    memberId,
    type,
    title,
    content,
    relatedId,
    relatedType,
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.get('/settings/:memberId', async (req, res) => {
  const result = await NotificationService.getNotificationSettings(req.params.memberId);
  return res.json(result);
});

router.put('/settings/:memberId', async (req, res) => {
  const updates = req.body;
  const result = await NotificationService.updateNotificationSettings(req.params.memberId, updates);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

export default router;

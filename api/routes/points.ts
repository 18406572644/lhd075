import { Router } from 'express';
import PointsService from '../services/PointsService';
import type { PointsActionType } from '../../shared/types';

const router = Router();

router.get('/user/:memberId', async (req, res) => {
  const result = await PointsService.getUserPoints(req.params.memberId);
  return res.json(result);
});

router.get('/records', async (req, res) => {
  const params = {
    memberId: req.query.memberId as string | undefined,
    actionType: req.query.actionType as PointsActionType | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  };
  const result = await PointsService.getPointsRecords(params);
  return res.json(result);
});

router.get('/ranking', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const result = await PointsService.getPointsRanking(limit);
  return res.json(result);
});

router.post('/dynamic', async (req, res) => {
  const { memberId, dynamicId } = req.body;
  if (!memberId || !dynamicId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: '缺少必要参数' },
    });
  }
  const result = await PointsService.awardPostDynamicPoints(memberId, dynamicId);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post('/invite', async (req, res) => {
  const { inviterId, invitedMemberId } = req.body;
  if (!inviterId || !invitedMemberId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: '缺少必要参数' },
    });
  }
  const result = await PointsService.awardInviteFriendPoints(inviterId, invitedMemberId);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post('/bonus', async (req, res) => {
  const { memberId, points, description, relatedId } = req.body;
  if (!memberId || !points || !description) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: '缺少必要参数' },
    });
  }
  const result = await PointsService.awardBonusPoints(memberId, points, description, relatedId);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

export default router;

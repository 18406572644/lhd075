import { Router } from 'express';
import AnalyticsService from '../services/AnalyticsService';

const router = Router();

router.get('/dashboard', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  const userRole = req.query.userRole as 'admin' | 'member' | undefined;
  const result = await AnalyticsService.getDashboardStats(userId, userRole);
  return res.json(result);
});

router.get('/challenge/:id', async (req, res) => {
  const result = await AnalyticsService.getChallengeStatistics(req.params.id);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

export default router;

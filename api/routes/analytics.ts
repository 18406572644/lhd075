import { Router } from 'express';
import AnalyticsService from '../services/AnalyticsService';
import type { ReportPeriod } from '../../shared/types';

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

router.get('/personal/:memberId', async (req, res) => {
  const result = await AnalyticsService.getPersonalAnalytics(req.params.memberId);
  return res.json(result);
});

router.get('/team', async (req, res) => {
  const challengeId = req.query.challengeId as string | undefined;
  const result = await AnalyticsService.getTeamAnalytics(challengeId);
  return res.json(result);
});

router.get('/admin/comparison', async (req, res) => {
  const result = await AnalyticsService.getAdminChallengeComparison();
  return res.json(result);
});

router.get('/deep', async (req, res) => {
  const memberId = req.query.memberId as string | undefined;
  const userRole = req.query.userRole as 'admin' | 'member' | undefined;
  const challengeId = req.query.challengeId as string | undefined;
  const result = await AnalyticsService.getDeepAnalytics(memberId, userRole, challengeId);
  return res.json(result);
});

router.get('/report', async (req, res) => {
  const period = req.query.period as ReportPeriod;
  const memberId = req.query.memberId as string | undefined;
  const userRole = req.query.userRole as 'admin' | 'member' | undefined;
  const challengeId = req.query.challengeId as string | undefined;
  const data = await AnalyticsService.getDeepAnalytics(memberId, userRole, challengeId);
  return res.json({ success: true, data: { period, analytics: data.data } });
});

export default router;

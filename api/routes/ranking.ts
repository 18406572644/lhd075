import { Router } from 'express';
import RankingService from '../services/RankingService';

const router = Router();

router.get('/challenge/:id', async (req, res) => {
  const sortBy = (req.query.sortBy as string) as
    | 'consecutive'
    | 'duration'
    | 'checkins'
    | 'rate'
    | undefined;
  const result = await RankingService.getChallengeRanking(req.params.id, sortBy || 'consecutive');
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

export default router;

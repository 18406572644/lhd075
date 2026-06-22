import { Router } from 'express';
import CheckinService from '../services/CheckinService';

const router = Router();

router.get('/', async (req, res) => {
  const params = {
    challengeId: req.query.challengeId as string | undefined,
    memberId: req.query.memberId as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };
  const result = await CheckinService.getAll(params);
  return res.json(result);
});

router.post('/', async (req, res) => {
  const result = await CheckinService.create(req.body);
  if (!result.success) {
    if (result.error?.code === 'DUPLICATE_CHECKIN' || result.error?.code === 'LATE_CHECKIN') {
      return res.status(409).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

export default router;

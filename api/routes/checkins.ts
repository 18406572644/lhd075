import { Router } from 'express';
import CheckinService from '../services/CheckinService';

const router = Router();

router.get('/', async (req, res) => {
  const withRelations = req.query.withRelations === 'true';
  const currentMemberId = req.query.currentMemberId as string | undefined;
  const page = parseInt(req.query.page as string) || undefined;
  const pageSize = parseInt(req.query.pageSize as string) || undefined;

  const params = {
    challengeId: req.query.challengeId as string | undefined,
    memberId: req.query.memberId as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };

  if (withRelations) {
    const result = await CheckinService.getAllWithRelations({
      ...params,
      currentMemberId,
      page,
      pageSize,
    });
    return res.json(result);
  }

  const result = await CheckinService.getAll(params);
  return res.json(result);
});

router.get('/:id', async (req, res) => {
  const currentMemberId = req.query.currentMemberId as string | undefined;
  const result = await CheckinService.getById(req.params.id, currentMemberId);
  if (!result.success) return res.status(404).json(result);
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

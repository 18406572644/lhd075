import { Router } from 'express';
import ChallengeService from '../services/ChallengeService';

const router = Router();

router.get('/', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  const result = await ChallengeService.getAll(userId);
  return res.json(result);
});

router.get('/:id', async (req, res) => {
  const result = await ChallengeService.getById(req.params.id);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

router.post('/', async (req, res) => {
  const result = await ChallengeService.create(req.body);
  if (!result.success) return res.status(400).json(result);
  return res.status(201).json(result);
});

router.put('/:id', async (req, res) => {
  const result = await ChallengeService.update(req.params.id, req.body);
  if (!result.success) return res.status(400).json(result);
  return res.json(result);
});

router.post('/:id/join', async (req, res) => {
  const { memberId } = req.body;
  const result = await ChallengeService.joinChallenge(req.params.id, memberId);
  if (!result.success) return res.status(400).json(result);
  return res.json(result);
});

export default router;

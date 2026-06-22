import { Router } from 'express';
import UserProfileService from '../services/UserProfileService';

const router = Router();

router.put('/:id/profile', async (req, res) => {
  const result = await UserProfileService.updateProfile(req.params.id, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

router.post('/:id/password', async (req, res) => {
  const result = await UserProfileService.changePassword(req.params.id, req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

router.get('/:id/achievements', async (req, res) => {
  const result = await UserProfileService.getPersonalAchievements(req.params.id);
  if (!result.success) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

export default router;

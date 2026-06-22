import { Router } from 'express';
import CertificateService from '../services/CertificateService';

const router = Router();

router.get('/member/:memberId', async (req, res) => {
  const result = await CertificateService.getByMember(req.params.memberId);
  return res.json(result);
});

router.get('/:challengeId/:memberId', async (req, res) => {
  const result = await CertificateService.getOrCreate(req.params.challengeId, req.params.memberId);
  if (!result.success) return res.status(400).json(result);
  return res.json(result);
});

export default router;

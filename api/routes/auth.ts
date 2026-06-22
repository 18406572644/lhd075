import { Router } from 'express';
import AuthService from '../services/AuthService';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password, joinCode } = req.body;
  const result = await AuthService.login(username, password, joinCode);
  if (!result.success) {
    return res.status(401).json(result);
  }
  return res.json(result);
});

router.get('/users', async (_req, res) => {
  const result = await AuthService.getUsers();
  return res.json(result);
});

router.get('/users/:id', async (req, res) => {
  const result = await AuthService.getUserById(req.params.id);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

export default router;

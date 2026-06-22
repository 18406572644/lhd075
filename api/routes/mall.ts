import { Router } from 'express';
import MallService from '../services/MallService';
import type { MallItemType } from '../../shared/types';

const router = Router();

router.get('/items', async (req, res) => {
  const params = {
    type: req.query.type as MallItemType | undefined,
    isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
  };
  const result = await MallService.getAllItems(params);
  return res.json(result);
});

router.get('/items/:id', async (req, res) => {
  const result = await MallService.getItemById(req.params.id);
  if (!result.success) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

router.get('/user/:memberId', async (req, res) => {
  const params = {
    memberId: req.params.memberId,
    type: req.query.type as MallItemType | undefined,
    used: req.query.used !== undefined ? req.query.used === 'true' : undefined,
  };
  const result = await MallService.getUserItems(params);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

router.post('/exchange', async (req, res) => {
  const { mallItemId, memberId } = req.body;
  if (!mallItemId || !memberId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: '缺少必要参数' },
    });
  }
  const result = await MallService.exchange({ mallItemId, memberId });
  if (!result.success) {
    const code = result.error?.code;
    if (code === 'INSUFFICIENT_POINTS') {
      return res.status(402).json(result);
    }
    if (code === 'OUT_OF_STOCK') {
      return res.status(409).json(result);
    }
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.post('/items/:id/use', async (req, res) => {
  const { memberId } = req.body;
  const userMallItemId = req.params.id;
  if (!memberId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: '缺少必要参数' },
    });
  }
  const result = await MallService.useItem(userMallItemId, memberId);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

router.post('/items', async (req, res) => {
  const { name, type, description, pointsCost, imageUrl, stock, isActive, metadata } = req.body;
  if (!name || !type || !description || pointsCost === undefined || stock === undefined || isActive === undefined) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: '缺少必要参数' },
    });
  }
  const result = await MallService.addItem({
    name,
    type,
    description,
    pointsCost,
    imageUrl,
    stock,
    isActive,
    metadata,
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

router.put('/items/:id', async (req, res) => {
  const result = await MallService.updateItem(req.params.id, req.body);
  if (!result.success) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

router.delete('/items/:id', async (req, res) => {
  const result = await MallService.deleteItem(req.params.id);
  if (!result.success) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

export default router;

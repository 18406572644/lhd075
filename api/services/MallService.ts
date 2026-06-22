import db from '../db/index';
import type { ApiResponse, MallItem, UserMallItem, MallItemType, ExchangeRequest } from '../../shared/types';
import PointsService from './PointsService';

export class MallService {
  static async getAllItems(params?: {
    type?: MallItemType;
    isActive?: boolean;
  }): Promise<ApiResponse<MallItem[]>> {
    await db.read();
    let items = [...db.data.mallItems];
    if (params?.type) items = items.filter((i) => i.type === params.type);
    if (params?.isActive !== undefined) items = items.filter((i) => i.isActive === params.isActive);
    return {
      success: true,
      data: items.sort((a, b) => a.pointsCost - b.pointsCost),
    };
  }

  static async getItemById(id: string): Promise<ApiResponse<MallItem>> {
    await db.read();
    const item = db.data.mallItems.find((i) => i.id === id);
    if (!item) {
      return { success: false, error: { code: 'ITEM_NOT_FOUND', message: '商品不存在' } };
    }
    return { success: true, data: item };
  }

  static async getUserItems(params?: {
    memberId: string;
    type?: MallItemType;
    used?: boolean;
  }): Promise<ApiResponse<UserMallItem[]>> {
    if (!params?.memberId) {
      return { success: false, error: { code: 'MEMBER_ID_REQUIRED', message: '用户ID不能为空' } };
    }
    await db.read();
    let items = [...db.data.userMallItems].filter((i) => i.memberId === params.memberId);
    if (params?.type) items = items.filter((i) => i.type === params.type);
    if (params?.used !== undefined) items = items.filter((i) => i.used === params.used);
    return {
      success: true,
      data: items.sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)),
    };
  }

  static async exchange(request: ExchangeRequest): Promise<ApiResponse<UserMallItem>> {
    await db.read();

    const { mallItemId, memberId } = request;

    const mallItem = db.data.mallItems.find((i) => i.id === mallItemId);
    if (!mallItem) {
      return { success: false, error: { code: 'ITEM_NOT_FOUND', message: '商品不存在' } };
    }

    if (!mallItem.isActive) {
      return { success: false, error: { code: 'ITEM_NOT_ACTIVE', message: '该商品已下架' } };
    }

    if (mallItem.stock <= 0) {
      return { success: false, error: { code: 'OUT_OF_STOCK', message: '商品库存不足' } };
    }

    const user = db.data.users.find((u) => u.id === memberId);
    if (!user) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: '用户不存在' } };
    }

    const deductResult = await PointsService.deductPoints(
      memberId,
      mallItem.pointsCost,
      `兑换${mallItem.name}`,
      mallItemId,
    );

    if (!deductResult.success) {
      return { success: false, error: deductResult.error! };
    }

    const itemIdx = db.data.mallItems.findIndex((i) => i.id === mallItemId);
    db.data.mallItems[itemIdx] = {
      ...mallItem,
      stock: mallItem.stock - 1,
    };

    const userItemId = `user_mall_${Date.now()}`;
    const userItem: UserMallItem = {
      id: userItemId,
      memberId,
      mallItemId,
      name: mallItem.name,
      type: mallItem.type,
      imageUrl: mallItem.imageUrl,
      metadata: mallItem.metadata,
      used: false,
      purchasedAt: new Date().toISOString(),
    };
    db.data.userMallItems.push(userItem);
    await db.write();

    return { success: true, data: userItem };
  }

  static async useItem(userMallItemId: string, memberId: string): Promise<ApiResponse<UserMallItem>> {
    await db.read();

    const userItem = db.data.userMallItems.find((i) => i.id === userMallItemId && i.memberId === memberId);
    if (!userItem) {
      return { success: false, error: { code: 'ITEM_NOT_FOUND', message: '商品不存在或不属于该用户' } };
    }

    if (userItem.used) {
      return { success: false, error: { code: 'ITEM_ALREADY_USED', message: '该商品已使用' } };
    }

    const idx = db.data.userMallItems.findIndex((i) => i.id === userMallItemId);
    db.data.userMallItems[idx] = {
      ...userItem,
      used: true,
      usedAt: new Date().toISOString(),
    };
    await db.write();

    return { success: true, data: db.data.userMallItems[idx] };
  }

  static async addItem(item: Omit<MallItem, 'id' | 'createdAt'>): Promise<ApiResponse<MallItem>> {
    await db.read();

    const newId = `mall_${String(Date.now()).slice(-6)}`;
    const newItem: MallItem = {
      ...item,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    db.data.mallItems.push(newItem);
    await db.write();

    return { success: true, data: newItem };
  }

  static async updateItem(
    id: string,
    updates: Partial<Omit<MallItem, 'id' | 'createdAt'>>,
  ): Promise<ApiResponse<MallItem>> {
    await db.read();

    const idx = db.data.mallItems.findIndex((i) => i.id === id);
    if (idx === -1) {
      return { success: false, error: { code: 'ITEM_NOT_FOUND', message: '商品不存在' } };
    }

    db.data.mallItems[idx] = {
      ...db.data.mallItems[idx],
      ...updates,
    };
    await db.write();

    return { success: true, data: db.data.mallItems[idx] };
  }

  static async deleteItem(id: string): Promise<ApiResponse<boolean>> {
    await db.read();

    const idx = db.data.mallItems.findIndex((i) => i.id === id);
    if (idx === -1) {
      return { success: false, error: { code: 'ITEM_NOT_FOUND', message: '商品不存在' } };
    }

    db.data.mallItems.splice(idx, 1);
    await db.write();

    return { success: true, data: true };
  }
}

export default MallService;

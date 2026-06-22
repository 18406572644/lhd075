import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
import type { User, Challenge, Checkin, CertificateData, UserPoints, PointsRecord, MallItem, UserMallItem } from '../../shared/types';

export interface DatabaseSchema {
  users: User[];
  challenges: Challenge[];
  checkins: Checkin[];
  certificates: CertificateData[];
  userPoints: UserPoints[];
  pointsRecords: PointsRecord[];
  mallItems: MallItem[];
  userMallItems: UserMallItem[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const file = join(dataDir, 'db.json');

const today = new Date();
const formatDate = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
};

const challenge1Start = addDays(today, -15);
const challenge1End = addDays(today, 15);
const challenge2Start = addDays(today, -10);
const challenge2End = addDays(today, 20);

const genCheckins = (): Checkin[] => {
  const checkins: Checkin[] = [];
  const members = ['mem_001', 'mem_002', 'mem_003'];
  let id = 1;
  for (let i = 0; i < 14; i++) {
    const date = formatDate(addDays(challenge1Start, i));
    members.forEach((mid, idx) => {
      if (Math.random() > 0.2 - idx * 0.05) {
        checkins.push({
          id: `chk_${String(id++).padStart(4, '0')}`,
          challengeId: 'chal_001',
          memberId: mid,
          date,
          submittedAt: new Date(`${date}T08:${30 + idx * 10}:00Z`).toISOString(),
          exerciseType: 'running',
          duration: 25 + Math.floor(Math.random() * 35),
          extraData: { distance: 3 + Math.random() * 5, calories: 200 + Math.floor(Math.random() * 300) },
          note: '',
          status: 'normal',
        });
      }
    });
  }
  for (let i = 0; i < 9; i++) {
    const date = formatDate(addDays(challenge2Start, i));
    members.forEach((mid, idx) => {
      if (Math.random() > 0.25 - idx * 0.05) {
        checkins.push({
          id: `chk_${String(id++).padStart(4, '0')}`,
          challengeId: 'chal_002',
          memberId: mid,
          date,
          submittedAt: new Date(`${date}T19:${30 + idx * 10}:00Z`).toISOString(),
          exerciseType: i % 3 === 0 ? 'yoga' : 'workout',
          duration: 30 + Math.floor(Math.random() * 40),
          extraData: { sets: 3 + Math.floor(Math.random() * 5), calories: 150 + Math.floor(Math.random() * 400) },
          note: '',
          status: 'normal',
        });
      }
    });
  }
  return checkins;
};

const defaultData: DatabaseSchema = {
  users: [
    {
      id: 'admin_001',
      username: 'admin',
      password: 'admin123',
      name: '系统管理员',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
    {
      id: 'mem_001',
      username: 'zhangwei',
      password: '123456',
      name: '张伟',
      role: 'member',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei',
    },
    {
      id: 'mem_002',
      username: 'lina',
      password: '123456',
      name: '李娜',
      role: 'member',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lina',
    },
    {
      id: 'mem_003',
      username: 'wanghao',
      password: '123456',
      name: '王浩',
      role: 'member',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wanghao',
    },
    {
      id: 'mem_004',
      username: 'chenyue',
      password: '123456',
      name: '陈月',
      role: 'member',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenyue',
    },
  ],
  challenges: [
    {
      id: 'chal_001',
      name: '30天跑步挑战赛',
      type: 'running',
      description: '每天坚持跑步，培养运动习惯，提升心肺功能。每日至少运动30分钟。',
      startDate: formatDate(challenge1Start),
      endDate: formatDate(challenge1End),
      totalDays: 30,
      target: { minDurationPerDay: 30, extraField: 'distance' },
      coverImage: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
      createdBy: 'admin_001',
      createdAt: new Date().toISOString(),
      status: 'active',
      joinCode: 'RUN30',
      memberIds: ['mem_001', 'mem_002', 'mem_003', 'mem_004'],
    },
    {
      id: 'chal_002',
      name: '30天居家健身挑战',
      type: 'workout',
      description: '不用去健身房，在家完成每日训练。包含力量训练、瑜伽和拉伸。',
      startDate: formatDate(challenge2Start),
      endDate: formatDate(challenge2End),
      totalDays: 30,
      target: { minDurationPerDay: 25, extraField: 'sets' },
      coverImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
      createdBy: 'admin_001',
      createdAt: new Date().toISOString(),
      status: 'active',
      joinCode: 'FIT30',
      memberIds: ['mem_001', 'mem_002', 'mem_003'],
    },
    {
      id: 'chal_003',
      name: '21天早起骑行计划',
      type: 'cycling',
      description: '连续21天早上骑行，享受晨间清新空气，激活一天好心情。',
      startDate: formatDate(addDays(today, -25)),
      endDate: formatDate(addDays(today, -5)),
      totalDays: 21,
      target: { minDurationPerDay: 40, extraField: 'distance' },
      coverImage: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80',
      createdBy: 'admin_001',
      createdAt: new Date().toISOString(),
      status: 'ended',
      joinCode: 'RIDE21',
      memberIds: ['mem_001', 'mem_002'],
    },
  ],
  checkins: genCheckins(),
  certificates: [
    {
      id: 'cert_001',
      challengeId: 'chal_003',
      challengeName: '21天早起骑行计划',
      memberId: 'mem_001',
      memberName: '张伟',
      issuedAt: new Date().toISOString(),
      totalDays: 21,
      checkinDays: 19,
      completionRate: 90,
      totalDuration: 950,
      achievement: '运动达人',
    },
  ],
  userPoints: [
    {
      memberId: 'mem_001',
      totalPoints: 350,
      currentPoints: 280,
      lastCheckinDate: formatDate(addDays(today, 0)),
      consecutiveDays: 7,
      updatedAt: new Date().toISOString(),
    },
    {
      memberId: 'mem_002',
      totalPoints: 220,
      currentPoints: 220,
      lastCheckinDate: formatDate(addDays(today, -1)),
      consecutiveDays: 3,
      updatedAt: new Date().toISOString(),
    },
    {
      memberId: 'mem_003',
      totalPoints: 180,
      currentPoints: 120,
      lastCheckinDate: formatDate(addDays(today, -2)),
      consecutiveDays: 2,
      updatedAt: new Date().toISOString(),
    },
    {
      memberId: 'mem_004',
      totalPoints: 80,
      currentPoints: 80,
      lastCheckinDate: formatDate(addDays(today, -5)),
      consecutiveDays: 0,
      updatedAt: new Date().toISOString(),
    },
  ],
  pointsRecords: [
    {
      id: 'pt_rec_001',
      memberId: 'mem_001',
      actionType: 'checkin',
      points: 10,
      description: '每日签到',
      relatedId: 'chk_0001',
      createdAt: new Date(addDays(today, -7)).toISOString(),
    },
    {
      id: 'pt_rec_002',
      memberId: 'mem_001',
      actionType: 'consecutive_checkin',
      points: 5,
      description: '连续签到2天奖励',
      createdAt: new Date(addDays(today, -6)).toISOString(),
    },
    {
      id: 'pt_rec_003',
      memberId: 'mem_001',
      actionType: 'post_dynamic',
      points: 15,
      description: '发布运动动态',
      createdAt: new Date(addDays(today, -5)).toISOString(),
    },
    {
      id: 'pt_rec_004',
      memberId: 'mem_001',
      actionType: 'invite_friend',
      points: 100,
      description: '邀请好友注册',
      relatedId: 'mem_004',
      createdAt: new Date(addDays(today, -3)).toISOString(),
    },
    {
      id: 'pt_rec_005',
      memberId: 'mem_001',
      actionType: 'exchange',
      points: -70,
      description: '兑换运动达人徽章',
      relatedId: 'mall_001',
      createdAt: new Date(addDays(today, -2)).toISOString(),
    },
  ],
  mallItems: [
    {
      id: 'mall_001',
      name: '运动达人徽章',
      type: 'badge',
      description: '授予坚持运动的达人，彰显您的运动精神',
      pointsCost: 70,
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=badge1&backgroundColor=ffd700',
      stock: 100,
      isActive: true,
      metadata: { rarity: 'common', color: 'gold' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mall_002',
      name: '超级马拉松徽章',
      type: 'badge',
      description: '限量版徽章，只有真正的长跑者才能拥有',
      pointsCost: 200,
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=badge2&backgroundColor=c0c0c0',
      stock: 20,
      isActive: true,
      metadata: { rarity: 'rare', color: 'silver' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mall_003',
      name: '传奇挑战者徽章',
      type: 'badge',
      description: '传说级徽章，完成所有挑战的象征',
      pointsCost: 500,
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=badge3&backgroundColor=e5e4e2',
      stock: 5,
      isActive: true,
      metadata: { rarity: 'legendary', color: 'platinum' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mall_004',
      name: '渐变蓝证书皮肤',
      type: 'certificate_skin',
      description: '优雅的渐变蓝色调，让您的证书与众不同',
      pointsCost: 100,
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=skin1&backgroundColor=60a5fa',
      stock: 50,
      isActive: true,
      metadata: { theme: 'gradient', primaryColor: '#3b82f6', secondaryColor: '#60a5fa' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mall_005',
      name: '经典黑金证书皮肤',
      type: 'certificate_skin',
      description: '奢华黑金配色，彰显尊贵身份',
      pointsCost: 150,
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=skin2&backgroundColor=1f2937',
      stock: 30,
      isActive: true,
      metadata: { theme: 'classic', primaryColor: '#1f2937', secondaryColor: '#fbbf24' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mall_006',
      name: '商城5元优惠券',
      type: 'coupon',
      description: '可在合作商城抵扣5元现金',
      pointsCost: 50,
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=coupon1&backgroundColor=10b981',
      stock: 200,
      isActive: true,
      metadata: { discount: 5, currency: 'CNY', validDays: 30 },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mall_007',
      name: '运动品牌20元优惠券',
      type: 'coupon',
      description: '知名运动品牌满100减20优惠券',
      pointsCost: 120,
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=coupon2&backgroundColor=f59e0b',
      stock: 100,
      isActive: true,
      metadata: { discount: 20, minPurchase: 100, currency: 'CNY', validDays: 60 },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mall_008',
      name: '健身周卡体验券',
      type: 'coupon',
      description: '合作健身房7天免费体验',
      pointsCost: 180,
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=coupon3&backgroundColor=8b5cf6',
      stock: 50,
      isActive: true,
      metadata: { type: 'gym_pass', durationDays: 7 },
      createdAt: new Date().toISOString(),
    },
  ],
  userMallItems: [
    {
      id: 'user_mall_001',
      memberId: 'mem_001',
      mallItemId: 'mall_001',
      name: '运动达人徽章',
      type: 'badge',
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=badge1&backgroundColor=ffd700',
      metadata: { rarity: 'common', color: 'gold' },
      used: false,
      purchasedAt: new Date(addDays(today, -2)).toISOString(),
    },
    {
      id: 'user_mall_002',
      memberId: 'mem_003',
      mallItemId: 'mall_006',
      name: '商城5元优惠券',
      type: 'coupon',
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=coupon1&backgroundColor=10b981',
      metadata: { discount: 5, currency: 'CNY', validDays: 30 },
      used: true,
      usedAt: new Date(addDays(today, -1)).toISOString(),
      purchasedAt: new Date(addDays(today, -3)).toISOString(),
    },
  ],
};

const adapter = new JSONFile<DatabaseSchema>(file);
export const db = new Low<DatabaseSchema>(adapter, defaultData);

export async function initDb() {
  try {
    await db.read();
    if (!db.data || !db.data.users || db.data.users.length === 0) {
      db.data = defaultData;
      await db.write();
    } else {
      if (!db.data.userPoints) db.data.userPoints = defaultData.userPoints;
      if (!db.data.pointsRecords) db.data.pointsRecords = defaultData.pointsRecords;
      if (!db.data.mallItems) db.data.mallItems = defaultData.mallItems;
      if (!db.data.userMallItems) db.data.userMallItems = defaultData.userMallItems;
      await db.write();
    }
  } catch (err) {
    console.error('DB init error, writing default data:', err);
    db.data = defaultData;
    try {
      await db.write();
    } catch (writeErr) {
      console.error('DB write failed:', writeErr);
    }
  }
  console.log(`DB ready: ${file}`);
}

export default db;

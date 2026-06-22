import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
import type { User, Challenge, Checkin, CertificateData } from '../../shared/types';

export interface DatabaseSchema {
  users: User[];
  challenges: Challenge[];
  checkins: Checkin[];
  certificates: CertificateData[];
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
};

const adapter = new JSONFile<DatabaseSchema>(file);
export const db = new Low<DatabaseSchema>(adapter, defaultData);

export async function initDb() {
  try {
    await db.read();
    if (!db.data || !db.data.users || db.data.users.length === 0) {
      db.data = defaultData;
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

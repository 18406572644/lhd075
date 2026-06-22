import { useEffect, useState } from 'react';
import { Target, Plus, Filter, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import ChallengeCard from '@/components/ui/ChallengeCard';
import CheckinModal from '@/components/ui/CheckinModal';
import useAuthStore from '@/store/auth';
import useChallengeStore from '@/store/challenges';
import api from '@/lib/api';
import type { ChallengeStatus } from '@shared/types';

export default function ChallengesPage() {
  const { user } = useAuthStore();
  const { challenges, fetchAll } = useChallengeStore();
  const [filter, setFilter] = useState<'all' | ChallengeStatus>('all');
  const [search, setSearch] = useState('');
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [memberCheckins, setMemberCheckins] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAll(user?.id);
  }, [fetchAll, user]);

  useEffect(() => {
    if (user) {
      challenges.forEach((c) => {
        api.checkins
          .getAll({ challengeId: c.id, memberId: user.id })
          .then((r) => {
            if (r.success) {
              const days = new Set(r.data?.map((c2) => c2.date)).size;
              setMemberCheckins((prev) => ({ ...prev, [c.id]: days }));
            }
          });
      });
    }
  }, [challenges, user]);

  const filtered = challenges.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-neutral-800 mb-1">挑战赛广场</h1>
          <p className="text-neutral-500">
            共 {challenges.length} 场挑战，发现适合你的运动目标
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCheckinOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary-200 transition-all"
          >
            <Plus size={16} /> 快速打卡
          </button>
          {user?.role === 'admin' && (
            <Link
              to="/challenges/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary-50 text-secondary-700 font-bold text-sm hover:bg-secondary-100 transition-all border border-secondary-200"
            >
              <Target size={16} /> 创建挑战
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-card border border-neutral-100 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索挑战名称..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-neutral-500" />
          {(['all', 'active', 'upcoming', 'ended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-neutral-800 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {f === 'all' ? '全部' : f === 'active' ? '进行中' : f === 'upcoming' ? '即将开始' : '已结束'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white border border-dashed border-neutral-200 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
            <Target size={28} className="text-neutral-400" />
          </div>
          <h3 className="font-bold text-lg text-neutral-700 mb-1">未找到匹配的挑战</h3>
          <p className="text-sm text-neutral-500">试试调整搜索条件或创建新挑战</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              memberCheckins={memberCheckins[c.id]}
              isMember={!!user && c.memberIds.includes(user.id)}
              onJoin={() => user && useChallengeStore.getState().join(c.id, user.id)}
            />
          ))}
        </div>
      )}

      <CheckinModal
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        challenges={challenges}
      />
    </div>
  );
}

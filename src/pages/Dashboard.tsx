import { useEffect, useState } from 'react';
import { Users, Target, CalendarCheck, Clock, Flame, Activity, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '@/components/ui/StatCard';
import ChallengeCard from '@/components/ui/ChallengeCard';
import CheckinModal from '@/components/ui/CheckinModal';
import useAuthStore from '@/store/auth';
import useChallengeStore from '@/store/challenges';
import api from '@/lib/api';
import type { DashboardStats } from '@shared/types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { challenges, fetchAll } = useChallengeStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [memberCheckins, setMemberCheckins] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAll(user?.id);
    api.analytics.getDashboard(user?.id, user?.role).then((r) => r.success && setStats(r.data || null));
  }, [user, fetchAll]);

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

  const myChallenges = challenges.filter(
    (c) => !user || user.role === 'admin' || c.memberIds.includes(user.id)
  );
  const activeList = myChallenges.filter((c) => c.status !== 'ended').slice(0, 6);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-neutral-800 mb-1">
            {user?.role === 'admin' ? '管理控制台' : `你好，${user?.name || ''} 👋`}
          </h1>
          <p className="text-neutral-500">
            {user?.role === 'admin'
              ? '创建挑战、激励团队，一起来运动吧！'
              : stats?.myConsecutiveDays
              ? `已连续打卡 ${stats.myConsecutiveDays} 天，今天也要加油！`
              : '开始今天的打卡，养成好习惯'}
          </p>
        </div>
        <button
          onClick={() => setCheckinOpen(true)}
          className="self-start md:self-auto inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary-200 transition-all hover:-translate-y-0.5"
        >
          <Plus size={18} /> 立即打卡
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={Users}
          variant="orange"
          title="总成员数"
          value={stats?.totalMembers || 0}
          subtitle="位活跃团队成员"
          trend={{ value: 12, label: '本周' }}
        />
        <StatCard
          icon={Target}
          variant="teal"
          title="进行中挑战"
          value={stats?.activeChallenges || 0}
          subtitle="场精彩活动"
          trend={{ value: 8, label: '本月' }}
        />
        <StatCard
          icon={CalendarCheck}
          variant="purple"
          title="今日打卡率"
          value={`${stats?.todayCheckinRate || 0}%`}
          subtitle="成员今日已打卡"
        />
        <StatCard
          icon={Clock}
          variant="blue"
          title="累计运动时长"
          value={`${Math.round((stats?.totalDuration || 0) / 60)}h`}
          subtitle="全体成员总时长"
        />
      </div>

      {user?.role === 'member' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-3xl p-6 bg-gradient-to-br from-primary-500 via-orange-400 to-orange-300 text-white relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute right-8 top-6 w-16 h-16 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Flame size={22} className="text-yellow-100" />
                <span className="text-sm font-medium opacity-90">连续打卡</span>
              </div>
              <p className="font-display font-bold text-5xl mb-1">
                {stats?.myConsecutiveDays || 0}
                <span className="text-2xl ml-1 opacity-80">天</span>
              </p>
              <p className="text-sm opacity-85">
                已累计打卡 {stats?.myTotalCheckins || 0} 次
              </p>
            </div>
          </div>

          <div className="rounded-3xl p-6 bg-gradient-to-br from-secondary-500 via-teal-400 to-cyan-300 text-white relative overflow-hidden">
            <div className="absolute -left-10 -top-10 w-44 h-44 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={22} className="text-cyan-100" />
                <span className="text-sm font-medium opacity-90">本周运动指数</span>
              </div>
              <p className="font-display font-bold text-5xl mb-1">
                {Math.min(100, Math.round(((stats?.myTotalCheckins || 0) / 7) * 100))}
                <span className="text-2xl ml-1 opacity-80">分</span>
              </p>
              <p className="text-sm opacity-85">继续保持，超越上周！</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-neutral-800">
            {user?.role === 'admin' ? '全部挑战' : '我的挑战'}
          </h2>
          <Link
            to="/challenges"
            className="inline-flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700"
          >
            查看全部 <ArrowRight size={14} />
          </Link>
        </div>

        {activeList.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-dashed border-neutral-200 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
              <Target size={28} className="text-primary-500" />
            </div>
            <h3 className="font-bold text-lg text-neutral-700 mb-1">还没有参与的挑战</h3>
            <p className="text-sm text-neutral-500 mb-4">
              {user?.role === 'admin' ? '创建一个新挑战吧' : '加入一个挑战，开始打卡之旅'}
            </p>
            {user?.role === 'admin' ? (
              <Link
                to="/challenges/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition-all"
              >
                <Plus size={16} /> 创建挑战
              </Link>
            ) : (
              <Link
                to="/challenges"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition-all"
              >
                浏览挑战
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeList.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                memberCheckins={memberCheckins[c.id]}
                isMember={!!user && c.memberIds.includes(user.id)}
                onJoin={() => useChallengeStore.getState().join(c.id, user!.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CheckinModal
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        challenges={challenges}
      />
    </div>
  );
}

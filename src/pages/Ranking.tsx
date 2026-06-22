import { useEffect, useState } from 'react';
import { Trophy, Flame, Clock, Target, Medal } from 'lucide-react';
import api from '@/lib/api';
import useChallengeStore from '@/store/challenges';
import useAuthStore from '@/store/auth';
import type { RankingItem } from '@shared/types';
import { cn } from '@/lib/utils';

export default function RankingPage() {
  const { challenges, fetchAll } = useChallengeStore();
  const { user } = useAuthStore();
  const [selectedChallenge, setSelectedChallenge] = useState<string>('');
  const [sortBy, setSortBy] = useState<'consecutive' | 'duration' | 'checkins' | 'rate'>('consecutive');
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAll(user?.id).then(() => {
      const active = challenges.find((c) => c.status === 'active');
      if (active) setSelectedChallenge(active.id);
      else if (challenges[0]) setSelectedChallenge(challenges[0].id);
    });
  }, [fetchAll, user]);

  useEffect(() => {
    if (!selectedChallenge) return;
    setLoading(true);
    api.ranking.getChallengeRanking(selectedChallenge, sortBy).then((r) => {
      if (r.success) setRanking(r.data || []);
      setLoading(false);
    });
  }, [selectedChallenge, sortBy]);

  const current = challenges.find((c) => c.id === selectedChallenge);
  const myRank = user ? ranking.find((r) => r.memberId === user.id) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-neutral-800 mb-1 flex items-center gap-2">
            <Trophy size={28} className="text-primary-500" /> 排行榜
          </h1>
          <p className="text-neutral-500">和小伙伴们比拼坚持，一起冲向榜首！</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedChallenge}
            onChange={(e) => setSelectedChallenge(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-medium focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
          >
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {current && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-primary-500 via-orange-400 to-secondary-500 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3" />
          <div className="relative">
            <p className="text-white/80 text-sm mb-1">当前挑战</p>
            <h2 className="font-display font-bold text-2xl mb-4">{current.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20">
                <p className="text-white/70 mb-1 flex items-center gap-1"><Medal size={12} /> 参与人数</p>
                <p className="font-display font-bold text-2xl">{current.memberIds.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20">
                <p className="text-white/70 mb-1 flex items-center gap-1"><Target size={12} /> 总天数</p>
                <p className="font-display font-bold text-2xl">{current.totalDays}天</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20">
                <p className="text-white/70 mb-1 flex items-center gap-1"><Flame size={12} /> 最高连续</p>
                <p className="font-display font-bold text-2xl">
                  {ranking[0]?.consecutiveDays || 0}天
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20">
                <p className="text-white/70 mb-1 flex items-center gap-1"><Clock size={12} /> 总运动时长</p>
                <p className="font-display font-bold text-2xl">
                  {Math.round(ranking.reduce((s, r) => s + r.totalDuration, 0) / 60)}h
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {myRank && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-secondary-50 to-primary-50 border border-secondary-200 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center font-display font-bold text-2xl text-primary-600">
            #{myRank.rank}
          </div>
          <img src={user?.avatar} alt="" className="w-12 h-12 rounded-full object-cover bg-white" />
          <div className="flex-1">
            <p className="font-bold text-neutral-800">我的排名</p>
            <p className="text-xs text-neutral-500">
              连续{myRank.consecutiveDays}天 · 总时长{Math.round(myRank.totalDuration / 60)}h · 完成率{myRank.completionRate}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500">完成率</p>
            <p className="font-display font-bold text-3xl text-secondary-600">{myRank.completionRate}%</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-neutral-100 w-fit">
        {([
          ['consecutive', '🔥 连续天数'],
          ['duration', '⏱️ 总时长'],
          ['checkins', '✅ 打卡次数'],
          ['rate', '📊 完成率'],
        ] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setSortBy(v)}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
              sortBy === v
                ? 'bg-gradient-to-r from-primary-500 to-orange-400 text-white shadow-md shadow-primary-200'
                : 'text-neutral-600 hover:bg-neutral-50'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {ranking.length >= 3 && (
        <div className="grid grid-cols-3 gap-5 items-end">
          {[1, 0, 2].map((idx) => {
            const r = ranking[idx];
            if (!r) return <div key={idx} />;
            const heights = ['h-48', 'h-36', 'h-28'];
            const grays = [
              'from-yellow-400 via-yellow-500 to-amber-600',
              'from-slate-300 via-slate-400 to-slate-500',
              'from-orange-400 via-orange-500 to-orange-600',
            ];
            const medals = ['🥇', '🥈', '🥉'];
            const positions = ['order-2', 'order-1', 'order-3'];
            return (
              <div key={r.memberId} className={positions[idx]}>
                <div className="text-center mb-3 animate-float" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <img
                    src={r.avatar}
                    alt={r.memberName}
                    className={cn(
                      'w-16 h-16 mx-auto rounded-full border-4 bg-white object-cover',
                      idx === 0
                        ? 'border-yellow-300 w-20 h-20 shadow-xl'
                        : idx === 1
                        ? 'border-slate-300'
                        : 'border-orange-300'
                    )}
                  />
                  <p className="font-bold text-neutral-800 mt-2">{r.memberName}</p>
                  <p className="text-xs text-neutral-500">
                    {sortBy === 'consecutive' && `连续${r.consecutiveDays}天`}
                    {sortBy === 'duration' && `${Math.round(r.totalDuration / 60)}小时`}
                    {sortBy === 'checkins' && `${r.totalCheckins}次`}
                    {sortBy === 'rate' && `${r.completionRate}%`}
                  </p>
                </div>
                <div
                  className={cn(
                    'rounded-t-3xl bg-gradient-to-t shadow-lg relative',
                    grays[idx],
                    heights[idx]
                  )}
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-4xl">
                    {medals[idx]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-card border border-neutral-100 overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {loading ? (
            <div className="p-12 text-center text-neutral-500">加载中...</div>
          ) : (
            ranking.slice(3).map((r) => (
              <div key={r.memberId} className="p-5 flex items-center gap-4 hover:bg-neutral-50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-neutral-500">
                  #{r.rank}
                </div>
                <img src={r.avatar} alt="" className="w-11 h-11 rounded-full object-cover bg-neutral-100" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-800">{r.memberName}</p>
                  <div className="w-full max-w-xs h-2 bg-neutral-100 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-secondary-400 transition-all"
                      style={{ width: `${r.completionRate}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-5 text-xs text-right">
                  <div>
                    <p className="text-neutral-500">连续</p>
                    <p className="font-bold text-lg text-primary-600">{r.consecutiveDays}d</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">总时长</p>
                    <p className="font-bold text-lg text-secondary-700">{Math.round(r.totalDuration / 60)}h</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">完成率</p>
                    <p className="font-bold text-lg text-neutral-800">{r.completionRate}%</p>
                  </div>
                </div>
              </div>
            ))
          )}
          {!loading && ranking.length === 0 && (
            <div className="p-12 text-center text-neutral-500">暂无排名数据</div>
          )}
        </div>
      </div>
    </div>
  );
}

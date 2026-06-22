import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Users,
  CalendarCheck,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import useChallengeStore from '@/store/challenges';
import useAuthStore from '@/store/auth';
import api from '@/lib/api';
import type { ChallengeStatistics } from '@shared/types';

const COLORS = ['#FF6B35', '#2EC4B6', '#8B5CF6', '#3B82F6', '#F59E0B', '#EC4899', '#6366F1'];

export default function AnalyticsPage() {
  const { challenges, fetchAll } = useChallengeStore();
  const { user } = useAuthStore();
  const [selectedChallenge, setSelectedChallenge] = useState<string>('');
  const [stats, setStats] = useState<ChallengeStatistics | null>(null);
  const [globalStats, setGlobalStats] = useState<{
    weeklyTrend: { day: string; duration: number; count: number }[];
    typeDist: { type: string; count: number }[];
    memberActive: { name: string; count: number; duration: number }[];
  } | null>(null);

  useEffect(() => {
    fetchAll(user?.id).then(() => {
      const active = challenges.find((c) => c.status === 'active');
      if (active) setSelectedChallenge(active.id);
      else if (challenges[0]) setSelectedChallenge(challenges[0].id);
    });
  }, [fetchAll, user]);

  useEffect(() => {
    if (!selectedChallenge) return;
    api.analytics.getChallengeStatistics(selectedChallenge).then((r) => {
      if (r.success) setStats(r.data || null);
    });
  }, [selectedChallenge]);

  useEffect(() => {
    const load = async () => {
      const r = await api.checkins.getAll(
        user?.role === 'admin' ? undefined : { memberId: user?.id }
      );
      if (!r.success || !r.data) return;
      const data = r.data.filter((c) => c.status !== 'duplicate_warning');
      const week = ['日', '一', '二', '三', '四', '五', '六'];
      const weekly = week.map((d, i) => ({
        day: d,
        duration: 0,
        count: 0,
      }));
      data.forEach((c) => {
        const idx = new Date(c.date).getDay();
        weekly[idx].duration += c.duration;
        weekly[idx].count += 1;
      });
      const typeMap = new Map<string, number>();
      data.forEach((c) => typeMap.set(c.exerciseType, (typeMap.get(c.exerciseType) || 0) + 1));
      const typeDist = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
      const users = await api.auth.getUsers();
      const memberMap = new Map<string, { name: string; count: number; duration: number }>();
      (users.data || []).forEach((u) => {
        if (u.role === 'member') memberMap.set(u.id, { name: u.name, count: 0, duration: 0 });
      });
      data.forEach((c) => {
        const m = memberMap.get(c.memberId);
        if (m) {
          m.count += 1;
          m.duration += c.duration;
        }
      });
      const memberActive = Array.from(memberMap.values())
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 8);
      setGlobalStats({ weeklyTrend: weekly, typeDist, memberActive });
    };
    load();
  }, [user]);

  const current = challenges.find((c) => c.id === selectedChallenge);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-neutral-800 mb-1 flex items-center gap-2">
            <BarChart3 size={28} className="text-secondary-500" /> 数据分析
          </h1>
          <p className="text-neutral-500">多维度数据洞察，了解运动习惯与成长轨迹</p>
        </div>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: CalendarCheck,
            label: '总打卡次数',
            value: stats?.dailyCheckinTrend.reduce((s, d) => s + d.count, 0) || 0,
            unit: '次',
            gradient: 'from-primary-500 to-orange-400',
          },
          {
            icon: Users,
            label: '参与成员数',
            value: current?.memberIds.length || 0,
            unit: '人',
            gradient: 'from-secondary-500 to-teal-400',
          },
          {
            icon: Target,
            label: '平均完成率',
            value:
              stats && stats.memberProgress.length
                ? Math.round(
                    stats.memberProgress.reduce((s, m) => s + m.completionRate, 0) /
                      stats.memberProgress.length
                  )
                : 0,
            unit: '%',
            gradient: 'from-purple-500 to-violet-400',
          },
          {
            icon: Activity,
            label: '总运动时长',
            value: stats
              ? Math.round(
                  stats.memberProgress.reduce((s, m) => s + m.totalDuration, 0) / 60
                )
              : 0,
            unit: '小时',
            gradient: 'from-blue-500 to-cyan-400',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="relative p-5 rounded-2xl bg-white shadow-card border border-neutral-100 overflow-hidden"
          >
            <div
              className={`absolute -right-8 -top-8 w-28 h-28 rounded-full bg-gradient-to-br ${s.gradient} opacity-10`}
            />
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white mb-3`}
              >
                <s.icon size={18} />
              </div>
              <p className="text-xs font-bold text-neutral-500 mb-1">{s.label}</p>
              <p className="font-display font-bold text-2xl text-neutral-800">
                {s.value}
                <span className="text-sm text-neutral-500 ml-1">{s.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100 lg:col-span-2">
            <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-500" /> 每日打卡趋势
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyCheckinTrend}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FF6B35" />
                      <stop offset="100%" stopColor="#2EC4B6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="url(#grad1)"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, stroke: '#FF6B35', fill: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
            <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
              <PieIcon size={18} className="text-secondary-500" /> 运动类型占比
            </h3>
            {stats.exerciseTypeDistribution.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-neutral-400 text-sm">
                暂无数据
              </div>
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.exerciseTypeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="count"
                        paddingAngle={2}
                      >
                        {stats.exerciseTypeDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {stats.exerciseTypeDistribution.map((d, i) => (
                    <div key={d.type} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-neutral-600">
                        {({ running: '跑步', cycling: '骑行', swimming: '游泳', workout: '健身', walking: '步行', yoga: '瑜伽', custom: '其他' } as Record<string, string>)[d.type] || d.type}
                      </span>
                      <span className="ml-auto font-bold">{d.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {globalStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
            <h3 className="font-display font-bold text-lg text-neutral-800 mb-4">周运动时长分布</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={globalStats.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#5F5F50' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                    formatter={(v: number) => [`${v} 分钟`, '时长']}
                  />
                  <Bar dataKey="duration" radius={[10, 10, 0, 0]} fill="#2EC4B6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
            <h3 className="font-display font-bold text-lg text-neutral-800 mb-4">成员活跃度排行（总时长）</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={globalStats.memberActive}
                  layout="vertical"
                  margin={{ left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={60}
                    tick={{ fontSize: 12, fill: '#5F5F50' }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                    formatter={(v: number) => [`${Math.round(v / 60)} 小时`, '总时长']}
                  />
                  <Bar dataKey="duration" radius={[0, 8, 8, 0]} fill="#FF6B35" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="bg-white rounded-3xl shadow-card border border-neutral-100 overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <h3 className="font-display font-bold text-lg text-neutral-800">成员完成进度详情</h3>
          </div>
          <div className="divide-y divide-neutral-100">
            {stats.memberProgress.length === 0 ? (
              <div className="p-10 text-center text-neutral-500 text-sm">暂无数据</div>
            ) : (
              stats.memberProgress.map((m, idx) => (
                <div key={m.memberId} className="p-5 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center font-bold text-neutral-600 text-sm">
                    {idx + 1}
                  </div>
                  <img
                    src={m.avatar}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover bg-neutral-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-neutral-800">{m.memberName}</p>
                      <p className="text-sm font-bold text-primary-600">{m.completionRate}%</p>
                    </div>
                    <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={
                          'h-full bg-gradient-to-r ' +
                          (m.completionRate >= 80
                            ? 'from-secondary-500 to-teal-400'
                            : m.completionRate >= 50
                            ? 'from-primary-500 to-orange-400'
                            : 'from-amber-500 to-yellow-400')
                        }
                        style={{ width: `${m.completionRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right w-32">
                    <p className="text-xs text-neutral-500">打卡 {m.checkinDays} 天</p>
                    <p className="text-sm font-bold text-neutral-800">
                      {Math.round(m.totalDuration / 60)} 小时
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  Target,
  Copy,
  Plus,
  Trophy,
  TrendingUp,
  Award,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import useChallengeStore from '@/store/challenges';
import useAuthStore from '@/store/auth';
import api from '@/lib/api';
import CheckinModal from '@/components/ui/CheckinModal';
import type { ChallengeStatistics, RankingItem } from '@shared/types';

const COLORS = ['#FF6B35', '#2EC4B6', '#8B5CF6', '#3B82F6', '#F59E0B', '#EC4899'];

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { current, fetchById, challenges, join } = useChallengeStore();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [stats, setStats] = useState<ChallengeStatistics | null>(null);
  const [sortBy, setSortBy] = useState<'consecutive' | 'duration' | 'checkins' | 'rate'>('consecutive');
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      fetchById(id);
    }
  }, [id, fetchById]);

  useEffect(() => {
    if (!id) return;
    api.ranking.getChallengeRanking(id, sortBy).then((r) => r.success && setRanking(r.data || []));
    api.analytics.getChallengeStatistics(id).then((r) => r.success && setStats(r.data || null));
  }, [id, sortBy]);

  if (!current) {
    return <div className="text-center p-10 text-neutral-500">加载中...</div>;
  }

  const isMember = !!user && current.memberIds.includes(user.id);
  const pieData = stats
    ? [
        { name: '已达标', value: stats.completionDistribution.completed, color: '#2EC4B6' },
        { name: '进行中', value: stats.completionDistribution.partial, color: '#FF6B35' },
        { name: '未开始', value: stats.completionDistribution.notStarted, color: '#D1D5DB' },
      ]
    : [];

  const handleCopy = () => {
    navigator.clipboard?.writeText(current.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-primary-600 hover:border-primary-200 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-2xl text-neutral-800">{current.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                current.status === 'active'
                  ? 'bg-secondary-100 text-secondary-700'
                  : current.status === 'ended'
                  ? 'bg-neutral-200 text-neutral-600'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {current.status === 'active' ? '进行中' : current.status === 'ended' ? '已结束' : '即将开始'}
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-0.5">{current.description}</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 text-white text-sm font-bold hover:bg-neutral-700 transition-all"
          >
            <Copy size={14} />
            加入码: {current.joinCode} {copied && '已复制✓'}
          </button>
        )}
        {user?.role === 'member' && !isMember && (
          <button
            onClick={() => id && user && join(id, user.id)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary-200 transition-all"
          >
            <Plus size={16} /> 加入挑战
          </button>
        )}
        {isMember && current.status === 'active' && (
          <button
            onClick={() => setCheckinOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary-200 transition-all"
          >
            <Plus size={16} /> 立即打卡
          </button>
        )}
        {isMember && current.status === 'ended' && (
          <Link
            to={`/certificates`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary-500 to-secondary-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-secondary-200 transition-all"
          >
            <Award size={16} /> 查看证书
          </Link>
        )}
      </div>

      <div className="rounded-3xl overflow-hidden shadow-card border border-neutral-100">
        <div className="relative h-56">
          <img src={current.coverImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-wrap items-end justify-between gap-4 text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs opacity-80 mb-1 flex items-center gap-1">
                  <Calendar size={12} /> 挑战周期
                </p>
                <p className="font-bold">
                  {current.startDate} ~ {current.endDate}
                </p>
              </div>
              <div>
                <p className="text-xs opacity-80 mb-1 flex items-center gap-1">
                  <Target size={12} /> 总天数
                </p>
                <p className="font-bold text-xl">{current.totalDays} 天</p>
              </div>
              <div>
                <p className="text-xs opacity-80 mb-1 flex items-center gap-1">
                  <Users size={12} /> 参与成员
                </p>
                <p className="font-bold text-xl">{current.memberIds.length} 人</p>
              </div>
              <div>
                <p className="text-xs opacity-80 mb-1">每日目标</p>
                <p className="font-bold text-xl">≥{current.target.minDurationPerDay} 分钟</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-neutral-800 flex items-center gap-2">
                <TrendingUp size={20} className="text-secondary-500" /> 每日打卡人数趋势
              </h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyCheckinTrend}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
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
                    stroke="url(#lineGrad)"
                    strokeWidth={3}
                    dot={{ fill: '#FF6B35', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#FF6B35' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
            <h3 className="font-display font-bold text-lg text-neutral-800 mb-4">成员完成率分布</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {pieData.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-neutral-600">{p.name}</span>
                  </div>
                  <span className="font-bold text-neutral-800">{p.value} 人</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {stats && stats.exerciseTypeDistribution.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
          <h3 className="font-display font-bold text-lg text-neutral-800 mb-4">运动类型分布</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.exerciseTypeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 12, fill: '#5F5F50' }}
                  tickFormatter={(t) =>
                    ({ running: '跑步', cycling: '骑行', swimming: '游泳', workout: '健身', walking: '步行', yoga: '瑜伽', custom: '自定义' } as Record<string, string>)[t] || t
                  }
                />
                <YAxis tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#FF6B35" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-card border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-display font-bold text-lg text-neutral-800 flex items-center gap-2">
            <Trophy size={20} className="text-primary-500" /> 成员排行榜
          </h3>
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
            {([
              ['consecutive', '连续天数'],
              ['duration', '总时长'],
              ['checkins', '打卡次数'],
              ['rate', '完成率'],
            ] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSortBy(v)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  sortBy === v ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-600 hover:text-neutral-800'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-neutral-100">
          {ranking.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 text-sm">暂无排行榜数据</div>
          ) : (
            ranking.map((r) => {
              const rankBg =
                r.rank === 1
                  ? 'bg-gradient-to-r from-yellow-50 to-yellow-100/50'
                  : r.rank === 2
                  ? 'bg-gradient-to-r from-slate-50 to-slate-100/50'
                  : r.rank === 3
                  ? 'bg-gradient-to-r from-orange-50 to-orange-100/50'
                  : '';
              const medal =
                r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
              return (
                <div key={r.memberId} className={`p-5 flex items-center gap-4 ${rankBg}`}>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                      r.rank <= 3
                        ? ''
                        : 'bg-neutral-100 text-neutral-500 text-sm'
                    }`}
                  >
                    {medal || `#${r.rank}`}
                  </div>
                  <img
                    src={r.avatar}
                    alt={r.memberName}
                    className={`w-11 h-11 rounded-full object-cover bg-neutral-100 ${
                      r.rank <= 3 ? 'ring-2 ring-white shadow-lg' : ''
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-neutral-800">{r.memberName}</p>
                    </div>
                    <div className="w-full max-w-xs h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-secondary-400"
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
                      <p className="text-neutral-500">时长</p>
                      <p className="font-bold text-lg text-secondary-700">
                        {Math.round(r.totalDuration / 60)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">完成率</p>
                      <p className="font-bold text-lg text-neutral-800">{r.completionRate}%</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <CheckinModal
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        challenges={challenges}
        defaultChallengeId={id}
      />
    </div>
  );
}

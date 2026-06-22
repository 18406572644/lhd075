import { useEffect, useState, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Users,
  CalendarCheck,
  PieChart as PieIcon,
  Clock,
  Flame,
  Trophy,
  User,
  Shield,
  Download,
  FileText,
  ChevronRight,
  Scale,
  Zap,
  BarChart2,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import useChallengeStore from '@/store/challenges';
import useAuthStore from '@/store/auth';
import api from '@/lib/api';
import type {
  ChallengeStatistics,
  PersonalAnalytics,
  TeamAnalytics,
  AdminChallengeComparison,
  ReportPeriod,
  ChallengeType,
} from '@shared/types';

const COLORS = ['#FF6B35', '#2EC4B6', '#8B5CF6', '#3B82F6', '#F59E0B', '#EC4899', '#6366F1'];
const EXERCISE_LABELS: Record<string, string> = {
  running: '跑步', cycling: '骑行', swimming: '游泳', workout: '健身', walking: '步行', yoga: '瑜伽', custom: '其他',
};
const TIER_COLORS: Record<string, string> = {
  active: '#22C55E', moderate: '#3B82F6', low: '#F59E0B', inactive: '#94A3B8',
};
const TIER_LABELS: Record<string, string> = {
  active: '高活跃', moderate: '较活跃', low: '低活跃', inactive: '不活跃',
};

type TabType = 'personal' | 'team' | 'admin';

export default function AnalyticsPage() {
  const { challenges, fetchAll } = useChallengeStore();
  const { user } = useAuthStore();
  const reportRef = useRef<HTMLDivElement>(null);

  const [selectedChallenge, setSelectedChallenge] = useState<string>('');
  const [stats, setStats] = useState<ChallengeStatistics | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(user?.role === 'admin' ? 'team' : 'personal');
  const [personalData, setPersonalData] = useState<PersonalAnalytics | null>(null);
  const [teamData, setTeamData] = useState<TeamAnalytics | null>(null);
  const [adminData, setAdminData] = useState<AdminChallengeComparison[] | null>(null);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAll(user?.id).then(() => {
      const active = challenges.find((c) => c.status === 'active');
      if (active) setSelectedChallenge(active.id);
      else if (challenges[0]) setSelectedChallenge(challenges[0].id);
    });
  }, [fetchAll, user, challenges]);

  useEffect(() => {
    if (!selectedChallenge) return;
    api.analytics.getChallengeStatistics(selectedChallenge).then((r) => {
      if (r.success) setStats(r.data || null);
    });
  }, [selectedChallenge]);

  useEffect(() => {
    const load = async () => {
      if (user?.role === 'member') {
        const r = await api.analytics.getPersonalAnalytics(user.id);
        if (r.success) setPersonalData(r.data || null);
      }
      const t = await api.analytics.getTeamAnalytics(selectedChallenge || undefined);
      if (t.success) setTeamData(t.data || null);
      if (user?.role === 'admin') {
        const a = await api.analytics.getAdminComparison();
        if (a.success) setAdminData(a.data || null);
      }
    };
    load();
  }, [user, selectedChallenge]);

  const current = challenges.find((c) => c.id === selectedChallenge);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#FAFAF5',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight - 20;
      }
      const periodLabel = reportPeriod === 'monthly' ? '月度' : '季度';
      pdf.save(`运动数据分析报告_${periodLabel}_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const renderHourlyHeatmap = () => {
    if (!teamData?.hourlyHeatmap) return null;
    const max = Math.max(...teamData.hourlyHeatmap.map((h) => h.count), 1);
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-1">
          {teamData.hourlyHeatmap.map((h) => {
            const intensity = h.count / max;
            const bg = intensity > 0.75 ? '#FF6B35' : intensity > 0.5 ? '#FB923C' : intensity > 0.25 ? '#FED7AA' : '#F5F5F0';
            const textColor = intensity > 0.5 ? '#fff' : '#71717A';
            return (
              <div key={h.hour} className="relative group">
                <div
                  className="aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all hover:scale-110 cursor-pointer"
                  style={{ background: bg, color: textColor }}
                >
                  {h.count > 0 ? h.count : ''}
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {h.hour}:00 - {h.count}次
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>0:00</span>
          <span>6:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>强度：</span>
          <div className="flex gap-1">
            {['#F5F5F0', '#FED7AA', '#FB923C', '#FF6B35'].map((c) => (
              <div key={c} className="w-4 h-3 rounded" style={{ background: c }} />
            ))}
          </div>
          <span className="ml-2">低 → 高</span>
        </div>
      </div>
    );
  };

  const renderPersonalStats = () => {
    if (!personalData) return null;
    const s = personalData.totalStats;
    return [
      { icon: CalendarCheck, label: '累计打卡', value: s.totalCheckins, unit: '次', gradient: 'from-primary-500 to-orange-400' },
      { icon: Activity, label: '总运动时长', value: Math.round(s.totalDuration / 60), unit: '小时', gradient: 'from-secondary-500 to-teal-400' },
      { icon: Clock, label: '单次平均', value: s.avgDurationPerSession, unit: '分钟', gradient: 'from-purple-500 to-violet-400' },
      { icon: Flame, label: '连续打卡', value: s.consecutiveDays, unit: '天', gradient: 'from-blue-500 to-cyan-400' },
    ];
  };

  const radarData = (() => {
    if (!adminData || adminData.length === 0) return [];
    const metricKeys = ['completionRate', 'avgDuration', 'participationRate', 'consistencyScore', 'activeDays'];
    const metricLabels: Record<string, string> = {
      completionRate: '完成率', avgDuration: '平均时长', participationRate: '参与率', consistencyScore: '持续性', activeDays: '活跃天数',
    };
    const maxValues: Record<string, number> = {};
    metricKeys.forEach((k) => {
      maxValues[k] = Math.max(...adminData.map((d) => d.metrics[k as keyof typeof d.metrics] as number), 1);
    });
    return metricKeys.map((k) => {
      const row: Record<string, string | number> = { metric: metricLabels[k] };
      adminData.forEach((d) => {
        const v = d.metrics[k as keyof typeof d.metrics] as number;
        row[d.challengeName.slice(0, 6)] = Math.round((v / maxValues[k]) * 100);
      });
      return row;
    });
  })();

  const availableTabs: { key: TabType; label: string; icon: typeof User }[] = user?.role === 'admin'
    ? [{ key: 'team', label: '团队维度', icon: Users }, { key: 'admin', label: '管理员', icon: Shield }, { key: 'personal', label: '个人维度', icon: User }]
    : [{ key: 'personal', label: '个人维度', icon: User }, { key: 'team', label: '团队维度', icon: Users }];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-neutral-800 mb-1 flex items-center gap-2">
            <BarChart3 size={28} className="text-secondary-500" /> 深度数据分析
          </h1>
          <p className="text-neutral-500">多维度数据洞察，了解运动习惯与成长轨迹</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedChallenge}
            onChange={(e) => setSelectedChallenge(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-medium focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
          >
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value as ReportPeriod)}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-medium focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
          >
            <option value="monthly">月度报告</option>
            <option value="quarterly">季度报告</option>
          </select>
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-orange-400 text-white text-sm font-bold shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            <Download size={16} />
            {exporting ? '导出中...' : '导出 PDF'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 bg-neutral-100/50 p-1.5 rounded-2xl w-fit">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === t.key
                ? 'bg-white shadow-md text-neutral-800'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div ref={reportRef} className="space-y-5">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: CalendarCheck, label: '总打卡次数', value: stats.dailyCheckinTrend.reduce((s, d) => s + d.count, 0), unit: '次', gradient: 'from-primary-500 to-orange-400' },
              { icon: Users, label: '参与成员数', value: current?.memberIds.length || 0, unit: '人', gradient: 'from-secondary-500 to-teal-400' },
              {
                icon: Target, label: '平均完成率', value: stats.memberProgress.length ? Math.round(stats.memberProgress.reduce((s, m) => s + m.completionRate, 0) / stats.memberProgress.length) : 0,
                unit: '%', gradient: 'from-purple-500 to-violet-400',
              },
              { icon: Activity, label: '总运动时长', value: stats ? Math.round(stats.memberProgress.reduce((s, m) => s + m.totalDuration, 0) / 60) : 0, unit: '小时', gradient: 'from-blue-500 to-cyan-400' },
            ].map((s) => (
              <div key={s.label} className="relative p-5 rounded-2xl bg-white shadow-card border border-neutral-100 overflow-hidden">
                <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full bg-gradient-to-br ${s.gradient} opacity-10`} />
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white mb-3`}>
                    <s.icon size={18} />
                  </div>
                  <p className="text-xs font-bold text-neutral-500 mb-1">{s.label}</p>
                  <p className="font-display font-bold text-2xl text-neutral-800">
                    {s.value}<span className="text-sm text-neutral-500 ml-1">{s.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'personal' && personalData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {renderPersonalStats()?.map((s) => (
                <div key={s.label} className="relative p-5 rounded-2xl bg-white shadow-card border border-neutral-100 overflow-hidden">
                  <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full bg-gradient-to-br ${s.gradient} opacity-10`} />
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white mb-3`}>
                      <s.icon size={18} />
                    </div>
                    <p className="text-xs font-bold text-neutral-500 mb-1">{s.label}</p>
                    <p className="font-display font-bold text-2xl text-neutral-800">
                      {s.value}<span className="text-sm text-neutral-500 ml-1">{s.unit}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100 lg:col-span-2">
                <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-primary-500" /> 最佳运动时间段分析
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={personalData.bestTimeSlot}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#8F8F7A' }} tickFormatter={(v) => `${v}:00`} />
                      <YAxis tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                        formatter={(v: number, name: string) => [v, name === 'count' ? '打卡次数' : '平均时长(分)']}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#FF6B35" name="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
                <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                  <Trophy size={18} className="text-secondary-500" /> 最佳时段
                </h3>
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-orange-400 flex items-center justify-center mb-4 shadow-xl shadow-primary-200">
                    <Clock size={36} className="text-white" />
                  </div>
                  <p className="font-display font-bold text-2xl text-neutral-800 mb-1">
                    {personalData.bestTimeSlotSummary.label}运动
                  </p>
                  <p className="text-sm text-neutral-500 mb-3">{personalData.bestTimeSlotSummary.hourRange}</p>
                  <div className="px-4 py-2 rounded-full bg-primary-50 text-primary-600 font-bold text-sm">
                    累计打卡 {personalData.bestTimeSlotSummary.count} 次
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
                <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                  <PieIcon size={18} className="text-secondary-500" /> 运动类型偏好
                </h3>
                {personalData.exerciseTypePreference.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-neutral-400 text-sm">暂无数据</div>
                ) : (
                  <>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={personalData.exerciseTypePreference} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                            dataKey="count" paddingAngle={2}
                          >
                            {personalData.exerciseTypePreference.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {personalData.exerciseTypePreference.map((d, i) => (
                        <div key={d.type} className="flex items-center gap-2 text-xs">
                          <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-neutral-600">{EXERCISE_LABELS[d.type] || d.type}</span>
                          <span className="ml-auto font-bold">{d.count}次 · {Math.round(d.duration / 60)}h</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100 lg:col-span-2">
                <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary-500" /> 个人进步趋势（周对比）
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={personalData.weeklyProgress}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                      <XAxis dataKey="weekLabel" tick={{ fontSize: 12, fill: '#5F5F50' }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                        formatter={(v: number, name: string) => {
                          if (name === 'totalDuration') return [`${Math.round(v / 60)} 小时`, '总时长'];
                          if (name === 'checkinCount') return [`${v} 天`, '打卡天数'];
                          return [`${v} 分钟`, '平均时长'];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => ({ totalDuration: '总时长(小时)', checkinCount: '打卡天数', avgDuration: '平均时长(分)' }[v] || v)} />
                      <Bar yAxisId="left" dataKey="totalDuration" radius={[6, 6, 0, 0]} fill="#2EC4B6" name="totalDuration" />
                      <Line yAxisId="right" type="monotone" dataKey="checkinCount" stroke="#FF6B35" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#FF6B35', strokeWidth: 2 }} name="checkinCount" />
                      <Line yAxisId="right" type="monotone" dataKey="avgDuration" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="avgDuration" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
              <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                <Scale size={18} className="text-purple-500" /> 身体数据趋势图
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={personalData.bodyDataTrend}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8F8F7A' }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#8F8F7A' }} domain={['auto', 'auto']} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8F8F7A' }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                      formatter={(v: number, name: string) => [
                        name === 'weight' ? `${v} kg` : `${v} %`,
                        name === 'weight' ? '体重' : '体脂率',
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => ({ weight: '体重 (kg)', bodyFat: '体脂率 (%)' }[v] || v)} />
                    <Area yAxisId="left" type="monotone" dataKey="weight" stroke="#8B5CF6" strokeWidth={3} fill="url(#weightGrad)" name="weight" />
                    <Line yAxisId="right" type="monotone" dataKey="bodyFat" stroke="#EC4899" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#EC4899', strokeWidth: 2 }} name="bodyFat" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === 'team' && teamData && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
                <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                  <BarChart2 size={18} className="text-primary-500" /> 每日打卡时段热力图
                </h3>
                {renderHourlyHeatmap()}
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
                <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-secondary-500" /> 出勤率趋势
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={teamData.attendanceTrend}>
                      <defs>
                        <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2EC4B6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#2EC4B6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8F8F7A' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                        formatter={(v: number, name: string) => name === 'rate' ? [`${v}%`, '出勤率'] : [v, '打卡人数']}
                      />
                      <Area type="monotone" dataKey="rate" stroke="#2EC4B6" strokeWidth={3} fill="url(#attendGrad)" dot={{ r: 3, fill: '#2EC4B6' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
              <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-primary-500" /> 各运动类型趋势
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={teamData.exerciseTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8F8F7A' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                      formatter={(_v: number, name: string) => [name, EXERCISE_LABELS[name] || name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => EXERCISE_LABELS[v as ChallengeType] || v} />
                    {Object.keys(teamData.exerciseTrend[0] || {})
                      .filter((k) => k !== 'date')
                      .map((k, i) => (
                        <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5}
                          dot={{ r: 3, fill: '#fff', stroke: COLORS[i % COLORS.length], strokeWidth: 2 }}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
                <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                  <Users size={18} className="text-secondary-500" /> 成员活跃分层
                </h3>
                <div className="space-y-4">
                  {teamData.memberActivityTier.map((tier) => (
                    <div key={tier.tier} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: TIER_COLORS[tier.tier] }} />
                          <span className="font-bold text-sm text-neutral-700">{TIER_LABELS[tier.tier]}</span>
                          <span className="text-xs text-neutral-400">({tier.count}人)</span>
                        </div>
                        <ChevronRight size={14} className="text-neutral-400" />
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {tier.members.slice(0, 6).map((m) => (
                          <div key={m.memberId} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-neutral-50 text-xs">
                            <img src={m.avatar} alt="" className="w-5 h-5 rounded-full" />
                            <span className="text-neutral-600 font-medium">{m.memberName}</span>
                            <span className="text-neutral-400">{m.count}次</span>
                          </div>
                        ))}
                        {tier.members.length > 6 && (
                          <div className="px-2 py-1 rounded-full bg-neutral-50 text-xs text-neutral-400">
                            +{tier.members.length - 6}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
                <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                  <Trophy size={18} className="text-primary-500" /> 团队 TOP 表现者
                </h3>
                <div className="space-y-3">
                  {teamData.topPerformers.map((m, i) => (
                    <div key={m.memberId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white'
                          : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                          : i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {i + 1}
                      </div>
                      <img src={m.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-neutral-800 text-sm">{m.memberName}</p>
                        <p className="text-xs text-neutral-500">打卡 {m.count} 次</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-lg text-primary-600">{Math.round(m.duration / 60)}</p>
                        <p className="text-xs text-neutral-400">小时</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'admin' && adminData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
              <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                <Zap size={18} className="text-primary-500" /> 挑战对比分析雷达图
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#E5E5E5" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#5F5F50' }} />
                    <PolarRadiusAxis tick={{ fontSize: 10, fill: '#8F8F7A' }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v: number) => [`${v}`, '得分']} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {adminData.map((d, i) => (
                      <Radar key={d.challengeId} name={d.challengeName.slice(0, 6)} dataKey={d.challengeName.slice(0, 6)}
                        stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} strokeWidth={2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-card border border-neutral-100">
              <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-secondary-500" /> 各挑战指标详情
              </h3>
              <div className="space-y-4">
                {adminData.map((d, i) => (
                  <div key={d.challengeId} className="p-4 rounded-2xl border border-neutral-100 hover:border-primary-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <p className="font-bold text-neutral-800">{d.challengeName}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: '完成率', value: `${d.metrics.completionRate}%`, color: 'text-primary-600' },
                        { label: '参与率', value: `${d.metrics.participationRate}%`, color: 'text-secondary-600' },
                        { label: '持续性', value: `${d.metrics.consistencyScore}%`, color: 'text-purple-600' },
                        { label: '平均时长', value: `${d.metrics.avgDuration}分`, color: 'text-blue-600' },
                        { label: '总打卡', value: `${d.metrics.totalCheckins}次`, color: 'text-amber-600' },
                        { label: '活跃天数', value: `${d.metrics.activeDays}天`, color: 'text-pink-600' },
                      ].map((m) => (
                        <div key={m.label} className="text-center p-2 rounded-lg bg-neutral-50">
                          <p className={`font-display font-bold ${m.color}`}>{m.value}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
                    <img src={m.avatar} alt="" className="w-11 h-11 rounded-full object-cover bg-neutral-100" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-neutral-800">{m.memberName}</p>
                        <p className="text-sm font-bold text-primary-600">{m.completionRate}%</p>
                      </div>
                      <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${
                            m.completionRate >= 80 ? 'from-secondary-500 to-teal-400'
                              : m.completionRate >= 50 ? 'from-primary-500 to-orange-400'
                              : 'from-amber-500 to-yellow-400'
                          }`}
                          style={{ width: `${m.completionRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right w-32">
                      <p className="text-xs text-neutral-500">打卡 {m.checkinDays} 天</p>
                      <p className="text-sm font-bold text-neutral-800">{Math.round(m.totalDuration / 60)} 小时</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

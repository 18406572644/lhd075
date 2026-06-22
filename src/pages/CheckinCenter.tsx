import { useEffect, useState } from 'react';
import { CalendarCheck, Plus, ChevronLeft, ChevronRight, History, FileText, AlertTriangle } from 'lucide-react';
import CheckinModal from '@/components/ui/CheckinModal';
import useAuthStore from '@/store/auth';
import useChallengeStore from '@/store/challenges';
import api from '@/lib/api';
import type { Checkin } from '@shared/types';
import { cn } from '@/lib/utils';

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

export default function CheckinCenterPage() {
  const { user } = useAuthStore();
  const { challenges, fetchAll } = useChallengeStore();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchAll(user?.id);
  }, [fetchAll, user]);

  useEffect(() => {
    if (!user) return;
    const params: Record<string, string> = { memberId: user.id };
    if (selectedChallenge !== 'all') params.challengeId = selectedChallenge;
    api.checkins.getAll(params).then((r) => r.success && setCheckins(r.data || []));
  }, [user, selectedChallenge]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const checkinMap = new Map<string, Checkin[]>();
  checkins.forEach((c) => {
    if (!checkinMap.has(c.date)) checkinMap.set(c.date, []);
    checkinMap.get(c.date)!.push(c);
  });

  const validCheckins = checkins.filter((c) => c.status !== 'duplicate_warning');
  const uniqueCheckinDates = new Set(validCheckins.map((c) => c.date));
  const duplicateCount = checkins.filter((c) => c.status === 'duplicate_warning').length;
  const lateCount = checkins.filter((c) => c.status === 'late').length;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date().toISOString().split('T')[0];

  const prevMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-neutral-800 mb-1">打卡中心</h1>
          <p className="text-neutral-500">
            累计打卡 {uniqueCheckinDates.size} 天
            {duplicateCount > 0 && ` · ${duplicateCount} 条重复记录已保留`}
            {lateCount > 0 && ` · ${lateCount} 次补卡`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedChallenge}
            onChange={(e) => setSelectedChallenge(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-medium focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
          >
            <option value="all">全部挑战</option>
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setCheckinOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary-200 transition-all"
          >
            <Plus size={16} /> 新建打卡
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-500 to-orange-400 text-white">
          <p className="text-sm opacity-90">本月打卡</p>
          <p className="font-display font-bold text-3xl mt-1">
            {
              Array.from(uniqueCheckinDates).filter((d) => {
                const dt = new Date(d);
                return dt.getFullYear() === year && dt.getMonth() === month;
              }).length
            }
            <span className="text-base ml-1 opacity-80"> 天</span>
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-secondary-500 to-teal-400 text-white">
          <p className="text-sm opacity-90">总运动时长</p>
          <p className="font-display font-bold text-3xl mt-1">
            {Math.round(validCheckins.reduce((s, c) => s + (c.duration ?? 0), 0) / 60)}
            <span className="text-base ml-1 opacity-80">小时</span>
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-400 text-white">
          <p className="text-sm opacity-90">总打卡次数</p>
          <p className="font-display font-bold text-3xl mt-1">
            {validCheckins.length}
            <span className="text-base ml-1 opacity-80">次</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-card border border-neutral-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-neutral-800 flex items-center gap-2">
            <CalendarCheck size={20} className="text-primary-500" /> 打卡日历
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-600"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 py-2 font-bold text-neutral-800 min-w-[120px] text-center">
              {year}年{month + 1}月
            </span>
            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-600"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdayLabels.map((w) => (
            <div key={w} className="text-center py-2 text-xs font-bold text-neutral-500">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, idx) => {
            if (!d) return <div key={idx} className="aspect-square" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const hasCheckin = uniqueCheckinDates.has(dateStr);
            const isToday = dateStr === today;
            const hasLate = checkinMap.get(dateStr)?.some((c) => c.status === 'late');
            const hasDup = checkinMap.get(dateStr)?.some((c) => c.status === 'duplicate_warning');
            return (
              <div
                key={idx}
                className={cn(
                  'aspect-square rounded-xl flex flex-col items-center justify-center text-sm relative transition-all cursor-pointer hover:scale-105',
                  isToday && 'ring-2 ring-primary-400 ring-offset-2',
                  hasCheckin
                    ? 'bg-gradient-to-br from-primary-500 to-orange-400 text-white font-bold shadow-md shadow-primary-200'
                    : 'bg-neutral-50 text-neutral-400 hover:bg-neutral-100'
                )}
              >
                <span>{d}</span>
                {(hasLate || hasDup) && hasCheckin && (
                  <span className="absolute -bottom-0.5 flex gap-0.5">
                    {hasLate && <span className="text-[8px]">⏰</span>}
                    {hasDup && <span className="text-[8px]">⚠️</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-neutral-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-gradient-to-br from-primary-500 to-orange-400" />
            已打卡
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded ring-2 ring-primary-400 ring-offset-1" />
            今日
          </div>
          <div className="flex items-center gap-2">
            <span>⏰ 补卡记录</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-500" />
            存在重复记录
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-card border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center gap-2">
          <History size={20} className="text-secondary-500" />
          <h2 className="font-display font-bold text-lg text-neutral-800">打卡记录</h2>
        </div>
        <div className="divide-y divide-neutral-100">
          {checkins.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 text-sm">暂无打卡记录，点击右上角立即打卡</div>
          ) : (
            checkins.map((c) => {
              const ch = challenges.find((ch) => ch.id === c.challengeId);
              const isOpen = expanded === c.id;
              return (
                <div key={c.id}>
                  <div
                    className="p-5 flex items-center gap-4 cursor-pointer hover:bg-neutral-50 transition-all"
                    onClick={() => setExpanded(isOpen ? null : c.id)}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center text-2xl">
                      {({ running: '🏃', cycling: '🚴', swimming: '🏊', workout: '💪', walking: '🚶', yoga: '🧘', custom: '✨' } as Record<string, string>)[c.exerciseType] || '✨'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-neutral-800 truncate">{ch?.name || '挑战'}</p>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold',
                            c.status === 'normal'
                              ? 'bg-green-50 text-green-700'
                              : c.status === 'late'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          )}
                        >
                          {c.status === 'normal' ? '正常' : c.status === 'late' ? '补卡' : '重复/冲突'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        {c.date} · {new Date(c.submittedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 提交
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600 text-xl">{c.duration}</p>
                      <p className="text-[10px] text-neutral-500">分钟</p>
                    </div>
                    <ChevronRight
                      size={16}
                      className={cn('text-neutral-400 transition-all', isOpen && 'rotate-90')}
                    />
                  </div>
                  {isOpen && (
                    <div className="px-5 pb-5 animate-fade-in">
                      <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">运动类型</p>
                          <p className="font-bold text-neutral-800">
                            {({ running: '跑步', cycling: '骑行', swimming: '游泳', workout: '健身训练', walking: '步行', yoga: '瑜伽', custom: '自定义' } as Record<string, string>)[c.exerciseType]}
                          </p>
                        </div>
                        {c.extraData?.distance !== undefined && (
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">运动距离</p>
                            <p className="font-bold text-neutral-800">{c.extraData.distance} km</p>
                          </div>
                        )}
                        {c.extraData?.sets !== undefined && (
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">训练组数</p>
                            <p className="font-bold text-neutral-800">{c.extraData.sets} 组</p>
                          </div>
                        )}
                        {c.extraData?.calories !== undefined && (
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">消耗卡路里</p>
                            <p className="font-bold text-neutral-800">{c.extraData.calories} kcal</p>
                          </div>
                        )}
                        {c.extraData?.steps !== undefined && (
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">步数</p>
                            <p className="font-bold text-neutral-800">{c.extraData.steps.toLocaleString()} 步</p>
                          </div>
                        )}
                        <div className="col-span-2 md:col-span-4">
                          <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1">
                            <FileText size={10} /> 备注
                          </p>
                          <p className="text-neutral-700">{c.note || '暂无备注'}</p>
                        </div>
                        {c.status === 'duplicate_warning' && (
                          <div className="col-span-2 md:col-span-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800">
                              <p className="font-bold mb-0.5">
                                {c.conflictResolution === 'overwrite' && '此记录覆盖了原始数据，旧记录已自动归档保留'}
                                {c.conflictResolution === 'keep_original' && '这是被保留的原始打卡记录（已被新数据覆盖归档）'}
                                {c.conflictResolution === 'add_duplicate' && '这是同一天内的额外重复打卡记录'}
                              </p>
                              {c.originalCheckinId && <p>关联记录ID: {c.originalCheckinId}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
        defaultChallengeId={selectedChallenge !== 'all' ? selectedChallenge : undefined}
      />
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Calendar, Target, FileText, Image } from 'lucide-react';
import useAuthStore from '@/store/auth';
import useChallengeStore from '@/store/challenges';
import type { ChallengeType } from '@shared/types';

const typeOptions: { value: ChallengeType; label: string; emoji: string }[] = [
  { value: 'running', label: '跑步', emoji: '🏃' },
  { value: 'cycling', label: '骑行', emoji: '🚴' },
  { value: 'swimming', label: '游泳', emoji: '🏊' },
  { value: 'workout', label: '健身训练', emoji: '💪' },
  { value: 'walking', label: '步行', emoji: '🚶' },
  { value: 'yoga', label: '瑜伽', emoji: '🧘' },
  { value: 'custom', label: '自定义', emoji: '✨' },
];

const coverImages = [
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80',
  'https://images.unsplash.com/photo-1540496905036-5937c10647cc?w=800&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
];

export default function CreateChallengePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { create } = useChallengeStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    type: 'running' as ChallengeType,
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 29);
      return d.toISOString().split('T')[0];
    })(),
    totalDays: 30,
    minDurationPerDay: 30,
    extraField: 'none' as 'distance' | 'sets' | 'calories' | 'steps' | 'none',
    coverImage: coverImages[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k: keyof typeof form, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === 'startDate' || k === 'endDate') {
      const s = new Date(k === 'startDate' ? (v as string) : form.startDate);
      const e = new Date(k === 'endDate' ? (v as string) : form.endDate);
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      setForm((f) => ({ ...f, totalDays: days }));
    }
  };

  const submit = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const res = await create({
      name: form.name,
      type: form.type,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      totalDays: form.totalDays,
      target: { minDurationPerDay: form.minDurationPerDay, extraField: form.extraField },
      coverImage: form.coverImage,
      createdBy: user.id,
    });
    setLoading(false);
    if (res.success) {
      navigate(`/challenges/${res.data?.id}`);
    } else {
      setError(res.error || '创建失败');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto p-10 bg-white rounded-3xl border border-neutral-200 text-center">
        <h2 className="font-bold text-xl mb-2">权限不足</h2>
        <p className="text-sm text-neutral-500 mb-4">仅管理员可创建挑战赛</p>
        <Link to="/dashboard" className="text-primary-600 font-bold text-sm">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/challenges"
          className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-primary-600 hover:border-primary-200 transition-all"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-800">创建挑战赛</h1>
          <p className="text-sm text-neutral-500">设置挑战规则，激励团队一起运动</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s
                  ? 'bg-gradient-to-br from-primary-500 to-orange-400 text-white shadow-md shadow-primary-200'
                  : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-1 rounded-full ${
                  step > s ? 'bg-primary-400' : 'bg-neutral-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-card border border-neutral-100 overflow-hidden">
        <div className="relative h-48 overflow-hidden">
          <img src={form.coverImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6 text-white">
            <p className="text-xs opacity-80 mb-1">挑战封面预览</p>
            <h3 className="font-display font-bold text-2xl">{form.name || '挑战名称'}</h3>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-1">
                  <Target size={14} /> 挑战名称
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="如：30天晨跑挑战"
                  className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">运动类型</label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {typeOptions.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => update('type', o.value)}
                      className={`py-4 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                        form.type === o.value
                          ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                          : 'bg-neutral-50 text-neutral-700 hover:bg-primary-50 border border-neutral-100'
                      }`}
                    >
                      <span className="text-lg">{o.emoji}</span>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-1">
                  <FileText size={14} /> 挑战描述
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="描述挑战目标、规则和激励措施..."
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-1">
                  <Image size={14} /> 挑战封面
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {coverImages.map((img) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => update('coverImage', img)}
                      className={`aspect-video rounded-xl overflow-hidden transition-all border-2 ${
                        form.coverImage === img
                          ? 'border-primary-500 ring-2 ring-primary-200'
                          : 'border-transparent hover:border-primary-200'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-1">
                    <Calendar size={14} /> 开始日期
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update('startDate', e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-1">
                    <Calendar size={14} /> 结束日期
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => update('endDate', e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-100">
                <p className="text-sm font-bold text-neutral-700">
                  挑战总天数：<span className="text-2xl text-primary-600 ml-1">{form.totalDays}</span> 天
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">
                  每日最低运动时长（分钟）
                </label>
                <div className="flex gap-2 mb-3">
                  {[15, 30, 45, 60, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => update('minDurationPerDay', m)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        form.minDurationPerDay === m
                          ? 'bg-secondary-500 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {m}分钟
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  value={form.minDurationPerDay}
                  onChange={(e) => update('minDurationPerDay', Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">附加数据字段</label>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    ['none', '无'],
                    ['distance', '距离(km)'],
                    ['sets', '训练组数'],
                    ['calories', '卡路里'],
                    ['steps', '步数'],
                  ] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => update('extraField', v)}
                      className={`py-3 rounded-xl text-xs font-bold transition-all ${
                        form.extraField === v
                          ? 'bg-secondary-500 text-white'
                          : 'bg-neutral-50 text-neutral-700 hover:bg-secondary-50 border border-neutral-100'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100">
                <h3 className="font-display font-bold text-xl text-neutral-800 mb-4">📋 挑战信息确认</h3>
                <dl className="grid grid-cols-2 gap-y-3 text-sm">
                  <dt className="text-neutral-500">挑战名称</dt>
                  <dd className="font-bold text-neutral-800">{form.name || '-'}</dd>
                  <dt className="text-neutral-500">运动类型</dt>
                  <dd className="font-bold text-neutral-800">
                    {typeOptions.find((o) => o.value === form.type)?.label}
                  </dd>
                  <dt className="text-neutral-500">挑战周期</dt>
                  <dd className="font-bold text-neutral-800">
                    {form.startDate} ~ {form.endDate} ({form.totalDays}天)
                  </dd>
                  <dt className="text-neutral-500">每日目标</dt>
                  <dd className="font-bold text-neutral-800">{form.minDurationPerDay} 分钟以上</dd>
                  <dt className="text-neutral-500">附加字段</dt>
                  <dd className="font-bold text-neutral-800">
                    {form.extraField === 'none'
                      ? '无'
                      : { distance: '距离', sets: '训练组数', calories: '卡路里', steps: '步数' }[form.extraField]}
                  </dd>
                  <dt className="text-neutral-500">描述</dt>
                  <dd className="font-bold text-neutral-800 col-span-2">
                    {form.description || '暂无描述'}
                  </dd>
                </dl>
              </div>
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="px-6 py-3 rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              上一步
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary-200 transition-all"
              >
                下一步 →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading || !form.name}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-secondary-500 to-secondary-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-secondary-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} /> {loading ? '创建中...' : '确认创建'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

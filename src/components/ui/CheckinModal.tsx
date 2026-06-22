import { useState, useEffect } from 'react';
import { X, Activity, Clock, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Challenge, ChallengeType, Checkin, CheckinConflictResponse, CreateCheckinInput } from '@shared/types';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import { cn } from '@/lib/utils';

const exerciseOptions: { value: ChallengeType; label: string }[] = [
  { value: 'running', label: '🏃 跑步' },
  { value: 'cycling', label: '🚴 骑行' },
  { value: 'swimming', label: '🏊 游泳' },
  { value: 'workout', label: '💪 健身训练' },
  { value: 'walking', label: '🚶 步行' },
  { value: 'yoga', label: '🧘 瑜伽' },
  { value: 'custom', label: '✨ 其他运动' },
];

export default function CheckinModal({
  open,
  onClose,
  challenges,
  defaultChallengeId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  challenges: Challenge[];
  defaultChallengeId?: string;
  onSuccess?: (c: Checkin) => void;
}) {
  const { user } = useAuthStore();
  const [challengeId, setChallengeId] = useState(defaultChallengeId || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [exerciseType, setExerciseType] = useState<ChallengeType>('running');
  const [duration, setDuration] = useState<number>(30);
  const [distance, setDistance] = useState<number | undefined>();
  const [calories, setCalories] = useState<number | undefined>();
  const [sets, setSets] = useState<number | undefined>();
  const [steps, setSteps] = useState<number | undefined>();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState<CheckinConflictResponse | null>(null);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setChallengeId(defaultChallengeId || challenges[0]?.id || '');
      setDate(new Date().toISOString().split('T')[0]);
      setExerciseType('running');
      setDuration(30);
      setDistance(undefined);
      setCalories(undefined);
      setSets(undefined);
      setSteps(undefined);
      setNote('');
      setConflict(null);
      setSuccess(false);
      setErrorMsg('');
    }
  }, [open, defaultChallengeId, challenges]);

  if (!open) return null;

  const activeChallenges = challenges.filter(
    (c) => c.status === 'active' && (!user || user.role === 'admin' || c.memberIds.includes(user.id))
  );

  const reset = () => {
    setConflict(null);
  };

  const submit = async (force?: CreateCheckinInput['force']) => {
    if (!user || !challengeId) return;
    setLoading(true);
    setErrorMsg('');
    const payload: CreateCheckinInput = {
      challengeId,
      memberId: user.id,
      date,
      exerciseType,
      duration,
      note: note || undefined,
      force,
    };
    const extra: NonNullable<CreateCheckinInput['extraData']> = {};
    if (distance !== undefined) extra.distance = distance;
    if (calories !== undefined) extra.calories = calories;
    if (sets !== undefined) extra.sets = sets;
    if (steps !== undefined) extra.steps = steps;
    if (Object.keys(extra).length) payload.extraData = extra;

    const res = await api.checkins.create(payload);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(res.data as Checkin);
        onClose();
      }, 1200);
    } else if (
      res.error?.code === 'DUPLICATE_CHECKIN' ||
      res.error?.code === 'LATE_CHECKIN'
    ) {
      setConflict(res.error.details as CheckinConflictResponse);
    } else {
      setErrorMsg(res.error?.message || '提交失败');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl animate-bounce-in overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-primary-50 to-secondary-50">
          <div>
            <h3 className="font-display font-bold text-xl text-neutral-800 flex items-center gap-2">
              <Activity className="text-primary-500" size={22} />
              今日打卡
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">记录你的运动成果，坚持每一天！</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-neutral-500 hover:text-primary-500 hover:bg-primary-50 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center shadow-glow mb-4 animate-bounce-in">
                <CheckCircle2 className="text-white" size={44} strokeWidth={2.5} />
              </div>
              <h4 className="font-display font-bold text-2xl text-neutral-800 mb-2">打卡成功！</h4>
              <p className="text-sm text-neutral-500">恭喜你又坚持了一天，继续加油 💪</p>
            </div>
          ) : conflict ? (
            <div className="animate-fade-in">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-5">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={22} />
                <div>
                  <h5 className="font-bold text-amber-800 mb-1">
                    {conflict.conflictType === 'duplicate' ? '⚠️ 今日已打卡' : '⏰ 补卡提醒'}
                  </h5>
                  <p className="text-sm text-amber-700">{conflict.message}</p>
                </div>
              </div>

              {conflict.existingRecord && (
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 mb-5">
                  <p className="text-xs font-bold text-neutral-500 mb-2">📋 原有打卡记录</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-neutral-500">运动类型：</span>
                      <span className="font-medium text-neutral-800">
                        {exerciseOptions.find((o) => o.value === conflict.existingRecord!.exerciseType)?.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">时长：</span>
                      <span className="font-medium text-neutral-800">
                        {conflict.existingRecord.duration} 分钟
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">提交时间：</span>
                      <span className="font-medium text-neutral-800">
                        {new Date(conflict.existingRecord.submittedAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {conflict.existingRecord.extraData?.distance && (
                      <div>
                        <span className="text-neutral-500">距离：</span>
                        <span className="font-medium text-neutral-800">
                          {conflict.existingRecord.extraData.distance} km
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {conflict.conflictType === 'duplicate' ? (
                  <>
                    <button
                      onClick={() => submit('keep_original')}
                      className="w-full py-3 rounded-xl bg-neutral-100 text-neutral-700 font-bold hover:bg-neutral-200 transition-all text-sm"
                    >
                      📌 保留原始记录（取消本次提交）
                    </button>
                    <button
                      onClick={() => submit('overwrite')}
                      className="w-full py-3 rounded-xl bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 transition-all text-sm"
                    >
                      ✏️ 覆盖原有记录（自动归档旧数据）
                    </button>
                    <button
                      onClick={() => submit('add_duplicate')}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-bold hover:shadow-md hover:shadow-primary-200 transition-all text-sm"
                    >
                      ➕ 追加为额外打卡记录
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => submit('mark_late')}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-bold hover:shadow-md hover:shadow-primary-200 transition-all text-sm"
                  >
                    ✅ 确认提交，标记为补卡
                  </button>
                )}
                <button
                  onClick={reset}
                  className="w-full py-2.5 text-sm text-neutral-500 hover:text-neutral-700"
                >
                  返回修改
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-2">选择挑战</label>
                <select
                  value={challengeId}
                  onChange={(e) => setChallengeId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                >
                  {activeChallenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {activeChallenges.length === 0 && <option value="">暂无进行中的挑战</option>}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-2">打卡日期</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-2">运动类型</label>
                  <select
                    value={exerciseType}
                    onChange={(e) => setExerciseType(e.target.value as ChallengeType)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                  >
                    {exerciseOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-2 flex items-center gap-1">
                  <Clock size={12} /> 运动时长（分钟）
                </label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDuration(m)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-xs font-bold transition-all',
                        duration === m
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-primary-50'
                      )}
                    >
                      {m}分钟
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                  placeholder="自定义时长..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-2">
                    距离 (km) - 可选
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={distance ?? ''}
                    onChange={(e) => setDistance(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                    placeholder="如 5.2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-2">
                    消耗卡路里 - 可选
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={calories ?? ''}
                    onChange={(e) => setCalories(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                    placeholder="如 300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-2">训练组数 - 可选</label>
                  <input
                    type="number"
                    min={0}
                    value={sets ?? ''}
                    onChange={(e) => setSets(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                    placeholder="如 8"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-2">步数 - 可选</label>
                  <input
                    type="number"
                    min={0}
                    value={steps ?? ''}
                    onChange={(e) => setSteps(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                    placeholder="如 8000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-2 flex items-center gap-1">
                  <FileText size={12} /> 备注（可选）
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm resize-none"
                  placeholder="记录今天的感受、PB、配速等..."
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{errorMsg}</p>
              )}
            </div>
          )}
        </div>

        {!success && !conflict && (
          <div className="px-6 pb-6 pt-3 border-t border-neutral-100 bg-neutral-50/50">
            <button
              onClick={() => submit()}
              disabled={loading || !challengeId || duration <= 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 via-primary-400 to-orange-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">提交中...</span>
              ) : (
                <>
                  <CheckCircle2 size={18} /> 确认打卡
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

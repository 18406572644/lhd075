import { CalendarDays, Users, Target, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Challenge } from '@shared/types';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, { label: string; color: string }> = {
  running: { label: '跑步', color: 'bg-orange-100 text-orange-700' },
  cycling: { label: '骑行', color: 'bg-blue-100 text-blue-700' },
  swimming: { label: '游泳', color: 'bg-cyan-100 text-cyan-700' },
  workout: { label: '健身', color: 'bg-purple-100 text-purple-700' },
  walking: { label: '步行', color: 'bg-green-100 text-green-700' },
  yoga: { label: '瑜伽', color: 'bg-pink-100 text-pink-700' },
  custom: { label: '自定义', color: 'bg-gray-100 text-gray-700' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  upcoming: { label: '即将开始', color: 'bg-yellow-100 text-yellow-700' },
  active: { label: '进行中', color: 'bg-secondary-100 text-secondary-700' },
  ended: { label: '已结束', color: 'bg-neutral-200 text-neutral-600' },
};

export default function ChallengeCard({
  challenge,
  memberCheckins,
  onJoin,
  isMember,
}: {
  challenge: Challenge;
  memberCheckins?: number;
  onJoin?: () => void;
  isMember?: boolean;
}) {
  const typeInfo = typeLabels[challenge.type] || typeLabels.custom;
  const statusInfo = statusLabels[challenge.status];
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = challenge.totalDays;
  const totalMs = end.getTime() - start.getTime();
  const progress =
    challenge.status === 'ended'
      ? 100
      : Math.min(100, Math.round(((today.getTime() - start.getTime()) / totalMs) * 100));
  const myProgress = memberCheckins
    ? Math.min(100, Math.round((memberCheckins / totalDays) * 100))
    : 0;
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <Link
      to={`/challenges/${challenge.id}`}
      className="group block rounded-3xl overflow-hidden bg-white shadow-card hover:shadow-cardHover transition-all duration-300 border border-neutral-100 hover:-translate-y-1"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={
            challenge.coverImage ||
            'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
          }
          alt={challenge.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={cn('px-3 py-1 rounded-full text-xs font-bold', typeInfo.color)}>
            {typeInfo.label}
          </span>
          <span className={cn('px-3 py-1 rounded-full text-xs font-bold', statusInfo.color)}>
            {statusInfo.label}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-display font-bold text-lg line-clamp-1 drop-shadow">
            {challenge.name}
          </h3>
        </div>
      </div>

      <div className="p-5">
        <p className="text-sm text-neutral-600 line-clamp-2 mb-4 h-10">{challenge.description}</p>

        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="flex items-center gap-2 text-neutral-500">
            <CalendarDays size={14} />
            <span>
              {start.getMonth() + 1}/{start.getDate()}-{end.getMonth() + 1}/{end.getDate()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-neutral-500">
            <Users size={14} />
            <span>{challenge.memberIds.length} 人参与</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-500">
            <Target size={14} />
            <span>{challenge.totalDays} 天</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-500">
            <Clock size={14} />
            <span>{challenge.status === 'ended' ? '已结束' : `剩 ${daysLeft} 天`}</span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>挑战进度</span>
            <span className="font-bold text-neutral-700">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-secondary-500 to-primary-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isMember && (
            <>
              <div className="flex justify-between text-xs text-neutral-500 mt-3">
                <span>我的进度</span>
                <span className="font-bold text-primary-600">
                  {memberCheckins || 0}/{totalDays}
                </span>
              </div>
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-orange-400 transition-all"
                  style={{ width: `${myProgress}%` }}
                />
              </div>
            </>
          )}
        </div>

        {onJoin && !isMember && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onJoin();
            }}
            className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-bold text-sm hover:shadow-md hover:shadow-primary-200 transition-all"
          >
            立即加入挑战
          </button>
        )}
      </div>
    </Link>
  );
}

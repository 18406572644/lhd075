import { useState } from 'react';
import {
  Clock,
  Calendar,
  MapPin,
  Flame,
  Zap,
  Footprints,
  ChevronRight,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  AlertCircle,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import type { CheckinWithRelations } from '@shared/types';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import LikeButton from './LikeButton';
import CommentSection from './CommentSection';
import useAuthStore from '@/store/auth';
import toast from 'react-hot-toast';

interface FeedItemProps {
  checkin: CheckinWithRelations;
  onUpdate?: (updated: CheckinWithRelations) => void;
  showFollowButton?: boolean;
  showChallenge?: boolean;
}

const EXERCISE_META: Record<string, { emoji: string; label: string }> = {
  running: { emoji: '🏃', label: '跑步' },
  cycling: { emoji: '🚴', label: '骑行' },
  swimming: { emoji: '🏊', label: '游泳' },
  workout: { emoji: '💪', label: '健身训练' },
  walking: { emoji: '🚶', label: '步行' },
  yoga: { emoji: '🧘', label: '瑜伽' },
  custom: { emoji: '✨', label: '自定义' },
};

export default function FeedItem({
  checkin,
  onUpdate,
  showFollowButton = true,
  showChallenge = true,
}: FeedItemProps) {
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [likeCount, setLikeCount] = useState(checkin.likeCount);
  const [isLiked, setIsLiked] = useState(!!checkin.isLiked);
  const [commentCount, setCommentCount] = useState(checkin.commentCount);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const meta = EXERCISE_META[checkin.exerciseType] || EXERCISE_META.custom;
  const isMine = checkin.memberId === user?.id;

  const handleToggleLike = async () => {
    if (!user) return;
    try {
      const res = await api.social.toggleCheckinLike(checkin.id, user.id);
      if (res.success) {
        setIsLiked(res.data.liked);
        setLikeCount(res.data.likeCount);
        onUpdate?.({ ...checkin, isLiked: res.data.liked, likeCount: res.data.likeCount });
      } else {
        toast.error(res.error?.message || '操作失败');
      }
    } catch {
      toast.error('网络错误');
    }
  };

  const handleToggleFollow = async () => {
    if (!user || !checkin.member || isMine) return;
    setFollowLoading(true);
    try {
      if (checkin.isFollowed) {
        const res = await api.follow.unfollow(user.id, checkin.memberId);
        if (res.success) {
          toast.success('已取消关注');
          onUpdate?.({ ...checkin, isFollowed: false });
        } else {
          toast.error(res.error?.message || '操作失败');
        }
      } else {
        const res = await api.follow.follow(user.id, checkin.memberId);
        if (res.success) {
          toast.success(res.data.isMutual ? '已互相关注 🎉' : '关注成功');
          onUpdate?.({ ...checkin, isFollowed: true });
        } else {
          toast.error(res.error?.message || '操作失败');
        }
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCommentCountChange = (delta: number) => {
    const newCount = Math.max(0, commentCount + delta);
    setCommentCount(newCount);
    onUpdate?.({ ...checkin, commentCount: newCount });
  };

  return (
    <div className="bg-white rounded-3xl shadow-card border border-neutral-100 overflow-hidden transition-all hover:shadow-lg">
      {/* 头部：用户信息+挑战+关注+更多 */}
      <div className="p-5 pb-4 flex items-start gap-3">
        <img
          src={
            checkin.member?.avatar ||
            'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (checkin.memberId || 'default')
          }
          alt=""
          className="w-12 h-12 rounded-2xl object-cover shrink-0 bg-neutral-100 ring-2 ring-white shadow-sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-neutral-800 truncate">
              {checkin.member?.nickname || checkin.member?.name || '未知用户'}
            </span>
            {checkin.status === 'late' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                补卡
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} /> {checkin.date}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />{' '}
              {new Date(checkin.submittedAt).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {showChallenge && checkin.challenge && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                🏆 {checkin.challenge.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {showFollowButton && !isMine && user && (
            <button
              onClick={handleToggleFollow}
              disabled={followLoading}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                followLoading && 'opacity-60 pointer-events-none',
                checkin.isFollowed
                  ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  : 'bg-gradient-to-r from-primary-500 to-primary-400 text-white hover:shadow-md hover:shadow-primary-200',
              )}
            >
              {checkin.isFollowed ? (
                <>
                  <UserMinus size={12} /> 已关注
                </>
              ) : (
                <>
                  <UserPlus size={12} /> 关注
                </>
              )}
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-xl hover:bg-neutral-100 transition-all"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-neutral-100 py-1 min-w-[120px] overflow-hidden">
                  <button
                    onClick={() => {
                      setReportOpen(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-neutral-600 hover:bg-neutral-50 flex items-center gap-2"
                  >
                    <AlertCircle size={12} /> 举报
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 运动主体内容 */}
      <div className="px-5 pb-4 space-y-3">
        {/* 运动类型+时长大卡片 */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-primary-50 via-orange-50 to-secondary-50 border border-primary-100/50">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl">
            {meta.emoji}
          </div>
          <div className="flex-1">
            <p className="text-xs text-neutral-500 mb-0.5">{meta.label}</p>
            <p className="font-display font-bold text-2xl text-neutral-800">
              {checkin.duration}
              <span className="text-sm ml-1 font-normal text-neutral-500">分钟</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right">
            {checkin.extraData?.distance !== undefined && (
              <div>
                <p className="text-[10px] text-neutral-400 inline-flex items-center gap-0.5">
                  <MapPin size={9} /> 距离
                </p>
                <p className="font-bold text-sm text-neutral-800">{checkin.extraData.distance}km</p>
              </div>
            )}
            {checkin.extraData?.calories !== undefined && (
              <div>
                <p className="text-[10px] text-neutral-400 inline-flex items-center gap-0.5">
                  <Flame size={9} /> 热量
                </p>
                <p className="font-bold text-sm text-neutral-800">{checkin.extraData.calories}kcal</p>
              </div>
            )}
            {checkin.extraData?.sets !== undefined && (
              <div>
                <p className="text-[10px] text-neutral-400 inline-flex items-center gap-0.5">
                  <Zap size={9} /> 组数
                </p>
                <p className="font-bold text-sm text-neutral-800">{checkin.extraData.sets}组</p>
              </div>
            )}
            {checkin.extraData?.steps !== undefined && (
              <div>
                <p className="text-[10px] text-neutral-400 inline-flex items-center gap-0.5">
                  <Footprints size={9} /> 步数
                </p>
                <p className="font-bold text-sm text-neutral-800">
                  {checkin.extraData.steps.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 备注文字 */}
        {checkin.note && (
          <p className="text-sm text-neutral-700 whitespace-pre-wrap break-words leading-relaxed px-1">
            {checkin.note}
          </p>
        )}

        {/* 图片展示区域 */}
        {checkin.images && checkin.images.length > 0 && (
          <div
            className={cn(
              'grid gap-1.5',
              checkin.images.length === 1 && 'grid-cols-1 max-w-md',
              checkin.images.length === 2 && 'grid-cols-2',
              checkin.images.length === 3 && 'grid-cols-3',
              checkin.images.length >= 4 && 'grid-cols-3',
            )}
          >
            {checkin.images.map((img, idx) => (
              <div
                key={img.id || idx}
                className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 cursor-pointer group"
                onClick={() => setPreviewImage(img.url)}
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {checkin.images!.length > 3 && idx === 2 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">
                    <ImageIcon size={16} className="mr-1" />
                    +{checkin.images!.length - 3}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 互动栏 */}
      <div className="px-5 py-3 border-t border-neutral-100 flex items-center gap-2 flex-wrap">
        <LikeButton liked={isLiked} count={likeCount} onToggle={handleToggleLike} />
        <CommentSection
          checkinId={checkin.id}
          initialCount={commentCount}
          onToggleCollapse={() => {
            setExpanded(!expanded);
          }}
        />
      </div>

      {/* 评论区展开后显示在互动栏下方 */}
      {expanded && (
        <div className="px-5 pb-5">
          <CommentSection
            checkinId={checkin.id}
            initialCount={commentCount}
            collapsed={false}
          />
          {/* 评论数量变化检测（通过onCommentCreated等方式，此处简单处理） */}
        </div>
      )}

      {/* 图片预览弹窗 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <X size={24} />
          </button>
          <img
            src={previewImage}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 举报弹窗 */}
      {reportOpen && (
        <ReportModal
          open
          targetType="checkin"
          targetId={checkin.id}
          reporterId={user?.id || ''}
          onClose={() => setReportOpen(false)}
          onSuccess={() => {
            setReportOpen(false);
            toast.success('举报已提交，管理员会尽快处理');
          }}
        />
      )}
    </div>
  );
}

function ReportModal({
  open,
  targetType,
  targetId,
  reporterId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  targetType: 'checkin' | 'comment';
  targetId: string;
  reporterId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const reasons = [
    '色情低俗内容',
    '垃圾广告或营销',
    '辱骂或人身攻击',
    '违法违规内容',
    '虚假不实信息',
    '其他原因',
  ];

  if (!open) return null;

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('请选择举报原因');
      return;
    }
    setLoading(true);
    try {
      const res = await api.social.reportContent({
        targetType,
        targetId,
        reporterId,
        reason,
        description: description || undefined,
      });
      if (res.success) onSuccess();
      else toast.error(res.error?.message || '举报失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-neutral-800 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" /> 举报内容
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-bold text-neutral-700 mb-2">选择举报原因 *</p>
            <div className="grid grid-cols-2 gap-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'p-2.5 text-xs rounded-xl border text-left transition-all',
                    reason === r
                      ? 'border-primary-400 bg-primary-50 text-primary-700 font-bold'
                      : 'border-neutral-200 hover:border-neutral-300 text-neutral-600',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-700 mb-2">补充说明（可选）</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="请提供更多细节以便我们核实处理..."
              className="w-full p-3 rounded-xl border border-neutral-200 text-sm focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
            />
          </div>
        </div>
        <div className="p-5 border-t border-neutral-100 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-100 transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
              loading || !reason
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-500 to-red-400 text-white hover:shadow-lg hover:shadow-red-200',
            )}
          >
            {loading ? '提交中...' : '提交举报'}
          </button>
        </div>
      </div>
    </div>
  );
}

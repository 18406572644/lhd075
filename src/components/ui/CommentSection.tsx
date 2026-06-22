import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Reply, Trash2, MoreHorizontal, X, AlertCircle } from 'lucide-react';
import type { CommentWithRelations } from '@shared/types';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import LikeButton from './LikeButton';
import useAuthStore from '@/store/auth';
import toast from 'react-hot-toast';

interface CommentSectionProps {
  checkinId: string;
  initialCount: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface ReplyState {
  commentId: string;
  replyToMemberId?: string;
  replyToName: string;
}

export default function CommentSection({
  checkinId,
  initialCount,
  collapsed: initialCollapsed = false,
  onToggleCollapse,
}: CommentSectionProps) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(!initialCollapsed);
  const [comments, setComments] = useState<CommentWithRelations[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [replyState, setReplyState] = useState<ReplyState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [reportOpen, setReportOpen] = useState<{
    targetType: 'checkin' | 'comment';
    targetId: string;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTotalCount(initialCount);
  }, [initialCount]);

  const loadComments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api.social.getCheckinComments(checkinId, user.id);
      if (res.success && res.data) {
        setComments(res.data);
        const count = res.data.reduce(
          (acc, c) => acc + 1 + (c.replyCount || c.replies?.length || 0),
          0,
        );
        setTotalCount(count);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user && comments.length === 0) {
      loadComments();
    }
  }, [isOpen, user, checkinId]);

  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggleCollapse?.();
    if (newState && comments.length === 0) {
      loadComments();
    }
  };

  const renderContentWithMentions = (content: string) => {
    const parts = content.split(/(@\S+)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-primary-600 font-bold cursor-pointer hover:underline">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  const handleSubmit = async () => {
    if (!user || !inputValue.trim() || isSubmitting) return;

    const content = inputValue.trim();
    if (content.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await api.social.createComment({
        checkinId,
        memberId: user.id,
        content,
        parentId: replyState?.commentId,
        replyToMemberId: replyState?.replyToMemberId,
      });

      if (res.success && res.data) {
        toast.success('评论发布成功');
        const sensitive = (res.data as any)._sensitiveWarning;
        if (sensitive) {
          toast(sensitive.message, { icon: '⚠️' });
        }
        setInputValue('');
        setReplyState(null);
        await loadComments();
      } else {
        toast.error(res.error?.message || '发布失败');
      }
    } catch {
      toast.error('网络错误，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!user) return;
    const res = await api.social.toggleCommentLike(commentId, user.id);
    if (!res.success) {
      toast.error('操作失败');
    } else {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, isLiked: res.data.liked, likeCount: res.data.likeCount };
          }
          const newReplies = (c.replies || []).map((r) =>
            r.id === commentId ? { ...r, isLiked: res.data.liked, likeCount: res.data.likeCount } : r,
          );
          return { ...c, replies: newReplies };
        }),
      );
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;
    if (!confirm('确定删除这条评论吗？')) return;

    const res = await api.social.deleteComment(commentId, user.id, user.role);
    if (res.success && res.data.deleted) {
      toast.success('已删除');
      await loadComments();
    } else {
      toast.error(res.error?.message || '删除失败');
    }
  };

  const handleStartReply = (comment: CommentWithRelations) => {
    setReplyState({
      commentId: comment.id,
      replyToMemberId: comment.member?.id,
      replyToName: comment.member?.nickname || comment.member?.name || '用户',
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const CommentItem = ({ comment, isReply = false }: { comment: CommentWithRelations; isReply?: boolean }) => {
    const isMyComment = comment.member?.id === user?.id;
    const isAdmin = user?.role === 'admin';
    const [showMenu, setShowMenu] = useState(false);

    return (
      <div className={cn('flex gap-3 animate-fade-in', isReply && 'pl-12')}>
        <img
          src={comment.member?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
          alt=""
          className="w-9 h-9 rounded-full object-cover shrink-0 bg-neutral-100"
        />
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-neutral-50 px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-sm text-neutral-800 truncate">
                  {comment.member?.nickname || comment.member?.name || '未知用户'}
                </span>
                {comment.replyToMember && (
                  <>
                    <span className="text-xs text-neutral-400">回复</span>
                    <span className="text-xs font-bold text-primary-600 truncate">
                      @{comment.replyToMember.nickname || comment.replyToMember.name}
                    </span>
                  </>
                )}
              </div>
              {!isReply && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-200 transition-all"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-neutral-100 py-1 min-w-[120px] overflow-hidden">
                        {(isMyComment || isAdmin) && (
                          <button
                            onClick={() => {
                              handleDelete(comment.id);
                              setShowMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={12} /> 删除
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setReportOpen({ targetType: 'comment', targetId: comment.id });
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
              )}
            </div>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap break-words">
              {renderContentWithMentions(comment.content)}
            </p>
          </div>
          <div className="flex items-center gap-4 mt-1.5 px-1 text-xs">
            <span className="text-neutral-400">
              {new Date(comment.createdAt).toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <LikeButton
              liked={!!comment.isLiked}
              count={comment.likeCount}
              size="sm"
              onToggle={() => handleToggleCommentLike(comment.id)}
            />
            {!isReply && comment.isDeleted !== true && (
              <button
                onClick={() => handleStartReply(comment)}
                className="inline-flex items-center gap-1 text-neutral-500 hover:text-primary-600 transition-all"
              >
                <Reply size={12} /> 回复
              </button>
            )}
            {isReply && (isMyComment || isAdmin) && comment.isDeleted !== true && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="inline-flex items-center gap-1 text-red-400 hover:text-red-600 transition-all"
              >
                <Trash2 size={12} /> 删除
              </button>
            )}
          </div>
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 border-neutral-100 pl-4">
              {comment.replies.map((r) => (
                <CommentItem key={r.id} comment={r} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <button
        onClick={toggleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-all"
      >
        <MessageSquare size={18} />
        <span className="font-bold tabular-nums">{totalCount}</span>
        <span>评论</span>
      </button>

      {isOpen && (
        <div ref={listRef} className="mt-4 pt-4 border-t border-neutral-100 space-y-4 animate-fade-in">
          {user && (
            <div className="flex gap-3">
              <img
                src={user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user.id || 'default')}
                alt=""
                className="w-9 h-9 rounded-full object-cover shrink-0 bg-neutral-100"
              />
              <div className="flex-1 space-y-2">
                {replyState && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-xl text-xs">
                    <Reply size={12} /> 回复 @{replyState.replyToName}
                    <button
                      onClick={() => setReplyState(null)}
                      className="ml-1 hover:bg-primary-100 rounded p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="说点什么，使用 @ 可以提及其他成员..."
                    rows={replyState ? 2 : 3}
                    className="w-full p-3 pr-12 rounded-2xl border border-neutral-200 bg-neutral-50 text-sm focus:border-primary-300 focus:ring-2 focus:ring-primary-100 focus:bg-white outline-none resize-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleSubmit();
                      }
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || isSubmitting}
                    className={cn(
                      'absolute bottom-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                      inputValue.trim() && !isSubmitting
                        ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white hover:shadow-lg hover:shadow-primary-200 active:scale-95'
                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed',
                    )}
                  >
                    <Send size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400">提示：Ctrl/⌘ + Enter 快速发送</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-sm text-neutral-400">加载评论中...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-6 text-sm text-neutral-400 flex flex-col items-center gap-2">
              <MessageSquare size={24} className="opacity-30" />
              暂无评论，抢个沙发吧~
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
            </div>
          )}
        </div>
      )}

      {reportOpen && (
        <ReportModal
          open
          targetType={reportOpen.targetType}
          targetId={reportOpen.targetId}
          reporterId={user?.id || ''}
          onClose={() => setReportOpen(null)}
          onSuccess={() => {
            setReportOpen(null);
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

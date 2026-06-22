import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => Promise<void> | void;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

export default function LikeButton({
  liked,
  count,
  onToggle,
  size = 'md',
  showCount = true,
  className,
}: LikeButtonProps) {
  const [localLiked, setLocalLiked] = useState(liked);
  const [localCount, setLocalCount] = useState(count);
  const [isLoading, setIsLoading] = useState(false);

  const sizeConfig = {
    sm: { icon: 14, text: 'text-xs', padding: 'px-2 py-1' },
    md: { icon: 18, text: 'text-sm', padding: 'px-3 py-1.5' },
    lg: { icon: 22, text: 'text-base', padding: 'px-4 py-2' },
  }[size];

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);

    const newLiked = !localLiked;
    const newCount = localCount + (newLiked ? 1 : -1);
    setLocalLiked(newLiked);
    setLocalCount(Math.max(0, newCount));

    try {
      await onToggle();
    } catch {
      setLocalLiked(localLiked);
      setLocalCount(localCount);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl transition-all select-none',
        sizeConfig.padding,
        localLiked
          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95'
          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 active:scale-95',
        isLoading && 'opacity-60 pointer-events-none',
        className,
      )}
    >
      <Heart
        size={sizeConfig.icon}
        className={cn('transition-all', localLiked && 'fill-rose-500 stroke-rose-500')}
      />
      {showCount && (
        <span className={cn('font-bold tabular-nums', sizeConfig.text)}>{localCount}</span>
      )}
    </button>
  );
}

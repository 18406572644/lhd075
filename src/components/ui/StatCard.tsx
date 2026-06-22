import { cn } from '@/lib/utils';

type Variant = 'orange' | 'teal' | 'purple' | 'blue';

const variants: Record<Variant, { bg: string; text: string }> = {
  orange: { bg: 'from-primary-500 to-primary-400', text: 'bg-primary-100 text-primary-600' },
  teal: { bg: 'from-secondary-500 to-secondary-400', text: 'bg-secondary-100 text-secondary-700' },
  purple: {
    bg: 'from-purple-500 to-purple-400',
    text: 'bg-purple-100 text-purple-600',
  },
  blue: { bg: 'from-blue-500 to-blue-400', text: 'bg-blue-100 text-blue-600' },
};

export default function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  variant = 'orange',
  trend,
}: {
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: Variant;
  trend?: { value: number; label: string };
}) {
  const v = variants[variant];
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white p-6 shadow-card hover:shadow-cardHover transition-all duration-300 border border-neutral-100 group hover:-translate-y-1'
      )}
    >
      <div
        className={cn(
          'absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 bg-gradient-to-br',
          v.bg
        )}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', v.text)}>
            <Icon size={22} strokeWidth={2} />
          </div>
          {trend && (
            <div
              className={cn(
                'text-xs font-bold px-2 py-1 rounded-full',
                trend.value >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              )}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
        </div>
        <p className="text-sm font-medium text-neutral-500 mb-1">{title}</p>
        <p className="text-3xl font-display font-bold text-neutral-800">{value}</p>
        {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

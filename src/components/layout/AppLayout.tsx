import {
  LayoutDashboard,
  Trophy,
  Target,
  CalendarCheck,
  BarChart3,
  Award,
  LogOut,
  PlusCircle,
  Menu,
  X,
  Coins,
  ShoppingBag,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { to: '/challenges', label: '挑战赛', icon: Target },
  { to: '/checkin', label: '打卡中心', icon: CalendarCheck },
  { to: '/points', label: '积分中心', icon: Coins },
  { to: '/mall', label: '积分商城', icon: ShoppingBag },
  { to: '/ranking', label: '排行榜', icon: Trophy },
  { to: '/analytics', label: '数据分析', icon: BarChart3 },
  { to: '/certificates', label: '证书中心', icon: Award },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navContent = (
    <>
      <div className="p-5 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-display font-bold text-lg text-neutral-800">FitChallenge</h1>
              <p className="text-xs text-neutral-500">团队健身打卡平台</p>
            </div>
          )}
        </div>
      </div>

      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-md shadow-primary-200'
                    : 'text-neutral-600 hover:bg-primary-50 hover:text-primary-600'
                )
              }
            >
              <Icon size={18} strokeWidth={2} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
        {user?.role === 'admin' && (
          <NavLink
            to="/challenges/create"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 mt-4',
                isActive
                  ? 'bg-gradient-to-r from-secondary-500 to-secondary-400 text-white shadow-md'
                  : 'bg-secondary-50 text-secondary-700 hover:bg-secondary-100 border border-dashed border-secondary-300'
              )
            }
          >
            <PlusCircle size={18} strokeWidth={2} />
            {!collapsed && <span>创建挑战</span>}
          </NavLink>
        )}
      </nav>

      <div className="p-4 border-t border-neutral-200">
        {user && (
          <div className={cn('mb-3', collapsed ? 'flex justify-center' : 'flex items-center gap-3')}>
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full border-2 border-primary-200 object-cover bg-primary-100"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-neutral-800 truncate">{user.name}</p>
                <p className="text-xs text-neutral-500">
                  {user.role === 'admin' ? '管理员' : '成员'}
                </p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-all',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={18} />
          {!collapsed && <span>退出登录</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 shadow-sm',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {navContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-neutral-200 rounded-full text-neutral-500 hover:text-primary-500 flex items-center justify-center shadow-sm"
        >
          <Menu size={12} />
        </button>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="absolute top-4 right-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600"
          >
            <X size={16} />
          </button>
        </div>
        {navContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-neutral-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-xs text-neutral-500">
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-secondary-500 animate-pulse" />
                {user.role === 'admin' ? '管理员模式' : '在线打卡'}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

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
  MessageSquarePlus,
  UserPlus,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/auth';
import usePointsStore from '@/store/points';
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
  const { userPoints, refreshUserPoints } = usePointsStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      refreshUserPoints(user.id);
    }
  }, [user, refreshUserPoints]);

  const handleLogout = () => {
    logout();
    usePointsStore.getState().clearAll();
    navigate('/login');
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePostDynamic = async () => {
    if (!user) return;
    try {
      const dynamicId = `dyn_${Date.now()}`;
      const res = await fetch('/api/points/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: user.id, dynamicId }),
      });
      const result = await res.json();
      if (result.success) {
        usePointsStore.getState().invalidateCache();
        usePointsStore.getState().refreshUserPoints(user.id, true);
        usePointsStore.getState().refreshRecords(user.id, true);
        showToast('success', `发布动态成功！获得 +${result.data.points} 积分`);
      } else {
        showToast('error', result.error?.message || '发布失败');
      }
    } catch {
      showToast('error', '发布失败，请稍后重试');
    }
    setQuickPanelOpen(false);
  };

  const handleInviteFriend = async () => {
    if (!user) return;
    const invitedName = prompt('请输入被邀请好友的昵称（演示）：');
    if (!invitedName) return;
    try {
      const invitedMemberId = `mem_inv_${Date.now()}`;
      const res = await fetch('/api/points/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviterId: user.id, invitedMemberId }),
      });
      const result = await res.json();
      if (result.success) {
        usePointsStore.getState().invalidateCache();
        usePointsStore.getState().refreshUserPoints(user.id, true);
        usePointsStore.getState().refreshRecords(user.id, true);
        showToast('success', `成功邀请好友「${invitedName}」！获得 +${result.data.points} 积分`);
      } else {
        showToast('error', result.error?.message || '邀请失败');
      }
    } catch {
      showToast('error', '邀请失败，请稍后重试');
    }
    setQuickPanelOpen(false);
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
        {user && !collapsed && userPoints && (
          <div className="mt-4 p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-amber-500" />
                <span className="text-xs font-medium text-amber-700">我的积分</span>
              </div>
              <span className="text-lg font-bold text-amber-600">{userPoints.currentPoints}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-amber-600/70">累计 {userPoints.totalPoints}</span>
              <span className="text-xs text-amber-600/70">连续 {userPoints.consecutiveDays} 天</span>
            </div>
          </div>
        )}
      </div>

      <nav className="p-3 space-y-1 flex-1">
        {!collapsed && (
          <div className="relative mb-2">
            <button
              onClick={() => setQuickPanelOpen(!quickPanelOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-secondary-500 to-orange-400 text-white shadow-md hover:shadow-lg transition-all"
            >
              <PlusCircle size={18} />
              <span>快捷赚积分</span>
            </button>
            {quickPanelOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 p-3 bg-white rounded-2xl shadow-xl border border-neutral-200 z-10 space-y-2">
                <button
                  onClick={handlePostDynamic}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all"
                >
                  <MessageSquarePlus size={18} />
                  <div className="text-left flex-1">
                    <p>发布运动动态</p>
                    <p className="text-xs text-purple-500">+15 积分 / 次</p>
                  </div>
                </button>
                <button
                  onClick={handleInviteFriend}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all"
                >
                  <UserPlus size={18} />
                  <div className="text-left flex-1">
                    <p>邀请好友注册</p>
                    <p className="text-xs text-orange-500">+100 积分 / 人</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

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
    <div className="min-h-screen bg-neutral-50 flex relative">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
          <div
            className={cn(
              'px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-medium',
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            )}
          >
            {toast.type === 'success' ? <Coins size={20} /> : <X size={20} />}
            {toast.text}
          </div>
        </div>
      )}

      <aside
        className={cn(
          'hidden lg:flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 shadow-sm relative',
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
            {user && userPoints && (
              <div className="md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-700 text-sm font-medium">
                <Coins size={14} />
                <span className="hidden sm:inline">当前积分:</span>
                <span className="font-bold">{userPoints.currentPoints}</span>
              </div>
            )}
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

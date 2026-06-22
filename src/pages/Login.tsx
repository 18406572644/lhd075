import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  User,
  Lock,
  Ticket,
  ShieldCheck,
  Users,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import { cn } from '@/lib/utils';

type Role = 'member' | 'admin';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [role, setRole] = useState<Role>('member');
  const [username, setUsername] = useState('zhangwei');
  const [password, setPassword] = useState('123456');
  const [joinCode, setJoinCode] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemo = (r: Role) => {
    setRole(r);
    if (r === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('zhangwei');
      setPassword('123456');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.login(username.trim(), password, joinCode.trim() || undefined);
      if (res.success && res.data) {
        if (role === 'admin' && res.data.user.role !== 'admin') {
          setError('该账号不是管理员，请选择"成员登录"');
          setLoading(false);
          return;
        }
        setUser({ ...res.data.user, token: res.data.token });
        navigate('/dashboard');
      } else {
        setError(res.error?.message || '登录失败');
      }
    } catch {
      setError('网络异常，请稍后重试');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-400 to-secondary-500" />
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="relative z-10 p-12 flex flex-col justify-end h-full text-white">
          <div className="mb-8 flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
              <Dumbbell size={28} />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl">FitChallenge</h1>
              <p className="text-white/80 text-sm">团队健身打卡平台</p>
            </div>
          </div>

          <h2 className="font-display font-bold text-4xl leading-tight mb-4">
            让运动成为习惯
            <br />
            <span className="bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
              让坚持成为荣耀
            </span>
          </h2>
          <p className="text-white/85 text-lg mb-8 max-w-md leading-relaxed">
            参与团队挑战赛，每日打卡记录运动轨迹，和伙伴们一起追逐健康目标，赢取专属成就证书。
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-lg">
            {[
              { icon: Users, label: '团队挑战', desc: '多人同场竞技' },
              { icon: Sparkles, label: '数据可视化', desc: '直观成长曲线' },
              { icon: ShieldCheck, label: '成就证书', desc: '专属荣誉认证' },
            ].map((f) => (
              <div
                key={f.label}
                className="p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 hover:bg-white/15 transition-all"
              >
                <f.icon size={22} className="text-yellow-200 mb-2" />
                <p className="font-bold text-sm">{f.label}</p>
                <p className="text-xs text-white/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md animate-slide-up">
          <div className="md:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow">
              <Dumbbell size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-neutral-800">FitChallenge</h1>
              <p className="text-xs text-neutral-500">团队健身打卡平台</p>
            </div>
          </div>

          <h2 className="font-display font-bold text-3xl text-neutral-800 mb-2">欢迎回来 👋</h2>
          <p className="text-neutral-500 mb-8">登录账户，继续今天的打卡挑战</p>

          <div className="mb-6 p-1.5 rounded-2xl bg-neutral-100 grid grid-cols-2">
            <button
              onClick={() => handleDemo('member')}
              className={cn(
                'py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                role === 'member' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-600'
              )}
            >
              <Users size={16} /> 成员登录
            </button>
            <button
              onClick={() => handleDemo('admin')}
              className={cn(
                'py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                role === 'admin' ? 'bg-white text-secondary-700 shadow-sm' : 'text-neutral-600'
              )}
            >
              <ShieldCheck size={16} /> 管理员
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-2">用户名</label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-200 bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all text-sm"
                  placeholder="请输入用户名"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-2">密码</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-neutral-200 bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all text-sm"
                  placeholder="请输入密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {role === 'member' && (
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-2">
                  挑战加入码（可选）
                </label>
                <div className="relative">
                  <Ticket
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-200 bg-white focus:border-secondary-400 focus:ring-4 focus:ring-secondary-100 outline-none transition-all text-sm uppercase tracking-wider"
                    placeholder="如 RUN30（登录时自动加入）"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-500 via-primary-400 to-orange-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary-200 disabled:opacity-60 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> 登录中...
                </>
              ) : (
                <>立即登录</>
              )}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-2xl bg-secondary-50/50 border border-secondary-100">
            <p className="text-xs font-bold text-secondary-800 mb-2 flex items-center gap-1">
              <Sparkles size={12} /> 演示账号
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
              <div className="p-2.5 rounded-xl bg-white border border-neutral-100">
                <p className="font-bold text-neutral-800">成员</p>
                <p>zhangwei / 123456</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-neutral-100">
                <p className="font-bold text-neutral-800">管理员</p>
                <p>admin / admin123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

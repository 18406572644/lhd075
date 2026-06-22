import { useState, useEffect, useRef } from 'react';
import {
  User,
  Camera,
  Edit3,
  Calendar,
  Award,
  Flame,
  Trophy,
  Coins,
  Clock,
  Shield,
  Lock,
  LogOut,
  Share2,
  Download,
  X,
  Check,
  ChevronRight,
  Sparkles,
  Target,
  Medal,
  Star,
} from 'lucide-react';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import usePointsStore from '@/store/points';
import type { PersonalAchievements, Gender } from '@shared/types';
import StatCard from '@/components/ui/StatCard';
import { cn } from '@/lib/utils';

const genderLabels: Record<Gender, string> = {
  male: '男',
  female: '女',
  other: '其他',
  prefer_not_to_say: '保密',
};

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const { userPoints, refreshUserPoints } = usePointsStore();
  const [achievements, setAchievements] = useState<PersonalAchievements | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'basic' | 'achievements' | 'security'>('basic');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    signature: '',
    gender: 'prefer_not_to_say' as Gender,
    birthday: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setFormData({
      nickname: user.nickname || user.name,
      signature: user.signature || '',
      gender: (user.gender as Gender) || 'prefer_not_to_say',
      birthday: user.birthday || '',
    });
    loadAchievements();
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshUserPoints(user.id);
    }
  }, [user, refreshUserPoints]);

  const loadAchievements = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.profile.getAchievements(user.id);
      if (res.success && res.data) {
        setAchievements(res.data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const avatarDataUrl = event.target?.result as string;
      try {
        const res = await api.profile.updateProfile(user.id, { avatar: avatarDataUrl });
        if (res.success && res.data) {
          const updatedUser = { ...res.data, token: user.token };
          setUser(updatedUser);
          showToast('success', '头像更新成功');
        } else {
          showToast('error', res.error?.message || '更新失败');
        }
      } catch {
        showToast('error', '更新失败，请稍后重试');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const res = await api.profile.updateProfile(user.id, formData);
      if (res.success && res.data) {
        const updatedUser = { ...res.data, token: user.token };
        setUser(updatedUser);
        setEditing(false);
        showToast('success', '资料保存成功');
      } else {
        showToast('error', res.error?.message || '保存失败');
      }
    } catch {
      showToast('error', '保存失败，请稍后重试');
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('error', '两次输入的新密码不一致');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('error', '新密码长度不能少于6位');
      return;
    }
    try {
      const res = await api.profile.changePassword(
        user.id,
        passwordForm.oldPassword,
        passwordForm.newPassword
      );
      if (res.success) {
        setShowPasswordModal(false);
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        showToast('success', '密码修改成功');
      } else {
        showToast('error', res.error?.message || '修改失败');
      }
    } catch {
      showToast('error', '修改失败，请稍后重试');
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      usePointsStore.getState().clearAll();
      window.location.href = '/login';
    }
  };

  const handleShareCard = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '我的运动名片',
          text: `我已累计打卡${achievements?.totalCheckinDays || 0}天，快来和我一起运动吧！`,
        });
      } catch {
        // ignore
      }
    } else {
      showToast('success', '名片已生成，可截图分享');
    }
  };

  const handleDownloadCard = () => {
    showToast('success', '名片下载功能开发中');
  };

  if (!user) return null;

  const sectionLabels = [
    { key: 'basic', label: '基本资料', icon: User },
    { key: 'achievements', label: '运动成就', icon: Trophy },
    { key: 'security', label: '账号安全', icon: Shield },
  ] as const;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
          <div
            className={cn(
              'px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-medium',
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            )}
          >
            {toast.type === 'success' ? <Check size={20} /> : <X size={20} />}
            {toast.text}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">个人中心</h1>
          <p className="text-neutral-500 mt-1">管理您的个人信息和运动成就</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-card border border-neutral-100 p-6 sticky top-24">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 rounded-full border-4 border-primary-100 object-cover bg-primary-50"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-600"
                >
                  <Camera size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <h2 className="mt-4 text-xl font-bold text-neutral-800">
                {user.nickname || user.name}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {user.role === 'admin' ? '管理员' : '运动达人'}
              </p>
              {user.signature && (
                <p className="text-sm text-neutral-400 mt-2 italic">"{user.signature}"</p>
              )}
              <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                <Coins size={14} className="text-amber-500" />
                <span className="text-sm font-bold text-amber-600">
                  {userPoints?.currentPoints || 0} 积分
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-1">
              {sectionLabels.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveSection(item.key)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      activeSection === item.key
                        ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-md'
                        : 'text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    <ChevronRight size={16} className="ml-auto opacity-50" />
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowCardModal(true)}
              className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-secondary-500 to-orange-400 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Sparkles size={18} />
              生成运动名片
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeSection === 'basic' && (
            <div className="bg-white rounded-2xl shadow-card border border-neutral-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-neutral-800">基本资料</h3>
                <button
                  onClick={() => (editing ? handleSaveProfile() : setEditing(true))}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    editing
                      ? 'bg-primary-500 text-white hover:bg-primary-600'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  )}
                >
                  {editing ? <Check size={16} /> : <Edit3 size={16} />}
                  {editing ? '保存' : '编辑'}
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-2">昵称</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    disabled={!editing}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border text-sm transition-all',
                      editing
                        ? 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none'
                        : 'border-transparent bg-neutral-50 text-neutral-600'
                    )}
                    placeholder="请输入昵称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-2">姓名</label>
                  <div className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-transparent text-sm text-neutral-600">
                    {user.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-2">个性签名</label>
                  {editing ? (
                    <textarea
                      value={formData.signature}
                      onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm resize-none"
                      placeholder="写一句激励自己的话吧"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-transparent text-sm text-neutral-600 min-h-[80px]">
                      {user.signature || '暂无个性签名'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-2">性别</label>
                    {editing ? (
                      <select
                        value={formData.gender}
                        onChange={(e) =>
                          setFormData({ ...formData, gender: e.target.value as Gender })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm bg-white"
                      >
                        {Object.entries(genderLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-transparent text-sm text-neutral-600">
                        {genderLabels[user.gender as Gender] || '保密'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-2">生日</label>
                    {editing ? (
                      <input
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
                      />
                    ) : (
                      <div className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-transparent text-sm text-neutral-600 flex items-center gap-2">
                        <Calendar size={16} className="text-neutral-400" />
                        {user.birthday || '未设置'}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-2">用户名</label>
                  <div className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-transparent text-sm text-neutral-400">
                    {user.username}
                    <span className="ml-2 text-xs text-neutral-400">（不可修改）</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'achievements' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-card border border-neutral-100 p-6">
                <h3 className="text-lg font-bold text-neutral-800 mb-6">运动成就墙</h3>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <StatCard
                        icon={Flame}
                        title="累计打卡"
                        value={`${achievements?.totalCheckinDays || 0}天`}
                        subtitle="坚持运动的每一天"
                        variant="orange"
                      />
                      <StatCard
                        icon={Star}
                        title="最长连续"
                        value={`${achievements?.longestConsecutiveDays || 0}天`}
                        subtitle="你的最佳纪录"
                        variant="teal"
                      />
                      <StatCard
                        icon={Target}
                        title="完成挑战"
                        value={`${achievements?.completedChallenges || 0}个`}
                        subtitle="已完成的挑战赛"
                        variant="purple"
                      />
                      <StatCard
                        icon={Medal}
                        title="获得证书"
                        value={`${achievements?.earnedCertificates || 0}张`}
                        subtitle="荣誉的象征"
                        variant="blue"
                      />
                      <StatCard
                        icon={Coins}
                        title="累计积分"
                        value={achievements?.totalPoints || 0}
                        subtitle="运动获得的总积分"
                        variant="orange"
                      />
                      <StatCard
                        icon={Clock}
                        title="累计时长"
                        value={`${Math.floor((achievements?.totalDuration || 0) / 60)}小时`}
                        subtitle={`${achievements?.totalDuration || 0} 分钟`}
                        variant="teal"
                      />
                    </div>

                    <div className="mt-8">
                      <h4 className="text-md font-bold text-neutral-700 mb-4">成就徽章</h4>
                      <div className="flex flex-wrap gap-4">
                        {(achievements?.totalCheckinDays || 0) >= 7 && (
                          <div className="flex flex-col items-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                              <Flame size={28} className="text-white" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-amber-700">7天达人</p>
                          </div>
                        )}
                        {(achievements?.totalCheckinDays || 0) >= 30 && (
                          <div className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
                              <Trophy size={28} className="text-white" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-purple-700">月度之星</p>
                          </div>
                        )}
                        {(achievements?.completedChallenges || 0) >= 1 && (
                          <div className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg">
                              <Award size={28} className="text-white" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-blue-700">挑战者</p>
                          </div>
                        )}
                        {(achievements?.earnedCertificates || 0) >= 1 && (
                          <div className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                              <Medal size={28} className="text-white" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-green-700">证书达人</p>
                          </div>
                        )}
                        {(achievements?.totalPoints || 0) >= 100 && (
                          <div className="flex flex-col items-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                              <Coins size={28} className="text-white" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-yellow-700">积分达人</p>
                          </div>
                        )}
                        {(achievements?.longestConsecutiveDays || 0) >= 7 && (
                          <div className="flex flex-col items-center p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg">
                              <Star size={28} className="text-white" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-red-700">坚持不懈</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 rounded-2xl shadow-card p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2">生成我的运动名片</h3>
                    <p className="text-white/80 text-sm">
                      一键生成专属运动名片，分享给好友，一起燃烧卡路里！
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCardModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-primary-600 rounded-xl font-bold hover:bg-white/90 transition-all shadow-lg"
                  >
                    <Sparkles size={18} />
                    立即生成
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-white rounded-2xl shadow-card border border-neutral-100 p-6">
              <h3 className="text-lg font-bold text-neutral-800 mb-6">账号安全</h3>

              <div className="space-y-3">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-neutral-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-all">
                    <Lock size={22} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-neutral-800">修改密码</p>
                    <p className="text-sm text-neutral-500">定期修改密码，保护账号安全</p>
                  </div>
                  <ChevronRight size={20} className="text-neutral-300" />
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-neutral-100 hover:border-red-200 hover:bg-red-50/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
                    <LogOut size={22} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-neutral-800">退出登录</p>
                    <p className="text-sm text-neutral-500">安全退出当前账号</p>
                  </div>
                  <ChevronRight size={20} className="text-neutral-300" />
                </button>
              </div>

              <div className="mt-6 p-4 bg-neutral-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-neutral-700">账号安全状态</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      您的账号处于安全状态，请妥善保管您的密码。
                      <br />
                      建议定期更换密码，不要使用过于简单的密码。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
            <div className="relative">
              <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 p-8 pb-20">
                <button
                  onClick={() => setShowCardModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"
                >
                  <X size={18} />
                </button>
                <div className="text-center">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-20 h-20 rounded-full border-4 border-white/30 object-cover bg-white mx-auto shadow-xl"
                  />
                  <h3 className="mt-4 text-xl font-bold text-white">
                    {user.nickname || user.name}
                  </h3>
                  <p className="text-white/80 text-sm mt-1">
                    {user.signature || '热爱运动，热爱生活'}
                  </p>
                </div>
              </div>

              <div className="px-6 -mt-12">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-neutral-100">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary-600">
                        {achievements?.totalCheckinDays || 0}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">累计打卡</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-secondary-600">
                        {achievements?.longestConsecutiveDays || 0}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">最长连续</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">
                        {achievements?.totalPoints || 0}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">累计积分</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500">完成挑战</span>
                      <span className="font-medium text-neutral-700">
                        {achievements?.completedChallenges || 0} 个
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-neutral-500">获得证书</span>
                      <span className="font-medium text-neutral-700">
                        {achievements?.earnedCertificates || 0} 张
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-neutral-500">运动时长</span>
                      <span className="font-medium text-neutral-700">
                        {Math.floor((achievements?.totalDuration || 0) / 60)} 小时
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <p className="text-xs text-amber-600 text-center font-medium">
                      💪 FitChallenge · 让运动成为习惯
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 flex gap-3">
                <button
                  onClick={handleDownloadCard}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50 transition-all"
                >
                  <Download size={18} />
                  保存图片
                </button>
                <button
                  onClick={handleShareCard}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-medium hover:shadow-lg transition-all"
                >
                  <Share2 size={18} />
                  分享好友
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
            <div className="p-6 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-800">修改密码</h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-2">原密码</label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, oldPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
                  placeholder="请输入原密码"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-2">新密码</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
                  placeholder="请输入新密码（至少6位）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-2">确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
                  placeholder="请再次输入新密码"
                />
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleChangePassword}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-medium hover:shadow-lg transition-all"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

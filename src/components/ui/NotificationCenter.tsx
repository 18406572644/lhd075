import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Settings,
  CalendarClock,
  Target,
  Coins,
  Megaphone,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NOTIFICATION_TYPE_LABELS, type NotificationType, type Notification, type NotificationSettings } from '@shared/types';
import useNotificationsStore from '@/store/notifications';
import useAuthStore from '@/store/auth';

const typeIcons: Record<NotificationType, typeof Bell> = {
  checkin_reminder: CalendarClock,
  challenge_update: Target,
  points_change: Coins,
  system_announcement: Megaphone,
  interaction: MessageCircle,
};

const typeColors: Record<NotificationType, string> = {
  checkin_reminder: 'text-blue-500 bg-blue-50',
  challenge_update: 'text-purple-500 bg-purple-50',
  points_change: 'text-amber-500 bg-amber-50',
  system_announcement: 'text-rose-500 bg-rose-50',
  interaction: 'text-green-500 bg-green-50',
};

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    settings,
    activeTab,
    loading,
    refreshNotifications,
    refreshUnreadCount,
    refreshSettings,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setActiveTab,
  } = useNotificationsStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      refreshUnreadCount(user.id);
      const interval = setInterval(() => {
        refreshUnreadCount(user.id);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, refreshUnreadCount]);

  useEffect(() => {
    if (isOpen && user) {
      refreshNotifications(user.id, true);
      refreshSettings(user.id);
    }
  }, [isOpen, user, refreshNotifications, refreshSettings]);

  useEffect(() => {
    if (user && isOpen) {
      refreshNotifications(user.id, true);
    }
  }, [activeTab, user, isOpen, refreshNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && user) {
      await markAsRead(notification.id, user.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (user) {
      await markAllAsRead(user.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    if (user) {
      await deleteNotification(notificationId, user.id);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / (60 * 60 * 24 * 1000));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const tabs: { key: NotificationType | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'checkin_reminder', label: NOTIFICATION_TYPE_LABELS.checkin_reminder },
    { key: 'challenge_update', label: NOTIFICATION_TYPE_LABELS.challenge_update },
    { key: 'points_change', label: NOTIFICATION_TYPE_LABELS.points_change },
    { key: 'system_announcement', label: NOTIFICATION_TYPE_LABELS.system_announcement },
    { key: 'interaction', label: NOTIFICATION_TYPE_LABELS.interaction },
  ];

  const unreadByType = (type: NotificationType) => {
    return notifications.filter((n) => n.type === type && !n.read).length;
  };

  if (!user) return null;

  return (
    <div className={cn('relative', className)} ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 rounded-lg bg-neutral-100 hover:bg-primary-50 flex items-center justify-center text-neutral-600 hover:text-primary-600 transition-all"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-[380px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden z-50 animate-fade-in">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="font-bold text-neutral-800 flex items-center gap-2">
              <Bell size={18} className="text-primary-500" />
              消息中心
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary-50 transition-all"
              >
                <CheckCheck size={14} />
                全部已读
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  showSettings ? 'bg-primary-100 text-primary-600' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'
                )}
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {showSettings && settings ? (
            <NotificationSettingsPanel />
          ) : (
            <>
              <div className="h-10 px-4 py-2 border-b border-neutral-100 flex items-center gap-1 overflow-x-auto flex-shrink-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'h-6 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center flex-shrink-0',
                      activeTab === tab.key
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    )}
                  >
                    {tab.label}
                    {tab.key !== 'all' && unreadByType(tab.key as NotificationType) > 0 && (
                      <span className="ml-1 text-[10px] opacity-70">
                        ({unreadByType(tab.key as NotificationType)})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading.list ? (
                  <div className="p-8 text-center text-neutral-400">
                    <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full mx-auto mb-2" />
                    <p className="text-sm">加载中...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400">
                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无消息</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {notifications.map((notification) => {
                      const Icon = typeIcons[notification.type];
                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            'p-4 cursor-pointer transition-all group relative',
                            notification.read ? 'bg-white hover:bg-neutral-50' : 'bg-primary-50/30 hover:bg-primary-50/50'
                          )}
                        >
                          {!notification.read && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500" />
                          )}
                          <div className="flex gap-3 pl-3">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', typeColors[notification.type])}>
                              <Icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={cn('text-sm font-medium truncate', notification.read ? 'text-neutral-600' : 'text-neutral-800')}>
                                  {notification.title}
                                </h4>
                                <span className="text-xs text-neutral-400 flex-shrink-0">
                                  {formatTime(notification.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                                {notification.content}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                                  {NOTIFICATION_TYPE_LABELS[notification.type]}
                                </span>
                                <button
                                  onClick={(e) => handleDelete(e, notification.id)}
                                  className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationSettingsPanel() {
  const { user } = useAuthStore();
  const { settings, updateSettings } = useNotificationsStore();

  if (!user || !settings) return null;

  type SettingKey = keyof Omit<NotificationSettings, 'memberId' | 'updatedAt'>;

  const settingItems: { key: SettingKey; label: string; icon: typeof Bell; desc: string }[] = [
    { key: 'checkin_reminder', label: '打卡提醒', icon: CalendarClock, desc: '每日打卡提醒、补卡提醒等' },
    { key: 'challenge_update', label: '挑战动态', icon: Target, desc: '挑战赛进度、新挑战上线等' },
    { key: 'points_change', label: '积分变动', icon: Coins, desc: '积分获取、消费、兑换等' },
    { key: 'system_announcement', label: '系统公告', icon: Megaphone, desc: '系统维护、功能更新等' },
    { key: 'interaction', label: '互动消息', icon: MessageCircle, desc: '点赞、评论、关注等' },
  ];

  const handleToggle = async (key: SettingKey) => {
    const updates: Partial<Omit<NotificationSettings, 'memberId' | 'updatedAt'>> = {};
    updates[key] = !settings[key];
    await updateSettings(user.id, updates);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-2">
        <p className="text-xs text-neutral-500 mb-3">
          免打扰设置，关闭后将不再接收对应类型的通知
        </p>
        {settingItems.map((item) => {
          const Icon = item.icon;
          const enabled = settings[item.key];
          return (
            <div
              key={item.key as string}
              className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-all"
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                enabled ? 'bg-primary-100 text-primary-600' : 'bg-neutral-200 text-neutral-400'
              )}>
                <Icon size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-800">{item.label}</p>
                <p className="text-xs text-neutral-500">{item.desc}</p>
              </div>
              <button
                onClick={() => handleToggle(item.key)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-all duration-200',
                  enabled ? 'bg-primary-500' : 'bg-neutral-300'
                )}
              >
                <span className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200',
                  enabled ? 'left-6' : 'left-1'
                )} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

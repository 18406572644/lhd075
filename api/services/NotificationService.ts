import db from '../db/index';
import type { ApiResponse, Notification, NotificationType, NotificationSettings, NotificationListResponse } from '../../shared/types';

export class NotificationService {
  private static ensureSettings(memberId: string): NotificationSettings {
    let settings = db.data.notificationSettings.find((s) => s.memberId === memberId);
    if (!settings) {
      settings = {
        memberId,
        checkin_reminder: true,
        challenge_update: true,
        points_change: true,
        system_announcement: true,
        interaction: true,
        updatedAt: new Date().toISOString(),
      };
      db.data.notificationSettings.push(settings);
    }
    return settings;
  }

  static async getNotifications(params: {
    memberId: string;
    type?: NotificationType;
    read?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<NotificationListResponse>> {
    const { memberId, type, read, limit, offset } = params;

    await db.read();

    let notifications = db.data.notifications.filter((n) => n.memberId === memberId);

    if (type !== undefined) {
      notifications = notifications.filter((n) => n.type === type);
    }

    if (read !== undefined) {
      notifications = notifications.filter((n) => n.read === read);
    }

    notifications = notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const unreadCount = db.data.notifications.filter((n) => n.memberId === memberId && !n.read).length;
    const totalCount = notifications.length;

    if (offset !== undefined) {
      notifications = notifications.slice(offset);
    }
    if (limit !== undefined) {
      notifications = notifications.slice(0, limit);
    }

    return {
      success: true,
      data: {
        notifications: [...notifications],
        unreadCount,
        totalCount,
      },
    };
  }

  static async getUnreadCount(memberId: string): Promise<ApiResponse<{ count: number }>> {
    await db.read();
    const count = db.data.notifications.filter((n) => n.memberId === memberId && !n.read).length;
    return { success: true, data: { count } };
  }

  static async markAsRead(memberId: string, notificationId: string): Promise<ApiResponse<Notification>> {
    await db.read();

    const notification = db.data.notifications.find(
      (n) => n.id === notificationId && n.memberId === memberId,
    );

    if (!notification) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: '通知不存在' },
      };
    }

    notification.read = true;
    await db.write();

    return { success: true, data: { ...notification } };
  }

  static async markAllAsRead(memberId: string): Promise<ApiResponse<{ count: number }>> {
    await db.read();

    const unreadNotifications = db.data.notifications.filter(
      (n) => n.memberId === memberId && !n.read,
    );

    const count = unreadNotifications.length;
    unreadNotifications.forEach((n) => {
      n.read = true;
    });

    await db.write();

    return { success: true, data: { count } };
  }

  static async deleteNotification(memberId: string, notificationId: string): Promise<ApiResponse<{ success: boolean }>> {
    await db.read();

    const index = db.data.notifications.findIndex(
      (n) => n.id === notificationId && n.memberId === memberId,
    );

    if (index === -1) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: '通知不存在' },
      };
    }

    db.data.notifications.splice(index, 1);
    await db.write();

    return { success: true, data: { success: true } };
  }

  static async createNotification(params: {
    memberId: string;
    type: NotificationType;
    title: string;
    content: string;
    relatedId?: string;
    relatedType?: string;
  }): Promise<ApiResponse<Notification>> {
    const { memberId, type, title, content, relatedId, relatedType } = params;

    await db.read();

    const settings = this.ensureSettings(memberId);
    if (!settings[type]) {
      return {
        success: false,
        error: { code: 'NOTIFICATION_DISABLED', message: '该类型通知已被用户关闭' },
      };
    }

    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      memberId,
      type,
      title,
      content,
      read: false,
      relatedId,
      relatedType,
      createdAt: new Date().toISOString(),
    };

    db.data.notifications.push(notification);
    await db.write();

    return { success: true, data: notification };
  }

  static async getNotificationSettings(memberId: string): Promise<ApiResponse<NotificationSettings>> {
    await db.read();
    const settings = this.ensureSettings(memberId);
    await db.write();
    return { success: true, data: { ...settings } };
  }

  static async updateNotificationSettings(
    memberId: string,
    updates: Partial<Omit<NotificationSettings, 'memberId' | 'updatedAt'>>,
  ): Promise<ApiResponse<NotificationSettings>> {
    await db.read();

    const settings = this.ensureSettings(memberId);

    if (updates.checkin_reminder !== undefined) settings.checkin_reminder = updates.checkin_reminder;
    if (updates.challenge_update !== undefined) settings.challenge_update = updates.challenge_update;
    if (updates.points_change !== undefined) settings.points_change = updates.points_change;
    if (updates.system_announcement !== undefined) settings.system_announcement = updates.system_announcement;
    if (updates.interaction !== undefined) settings.interaction = updates.interaction;

    settings.updatedAt = new Date().toISOString();

    await db.write();

    return { success: true, data: { ...settings } };
  }
}

export default NotificationService;

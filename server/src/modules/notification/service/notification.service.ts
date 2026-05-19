import prisma from '../../../infrastructure/database/prisma';
import { emitToUser } from '../../../infrastructure/websocket';
import { NotFoundError } from '../../../shared/errors/AppError';

export class NotificationService {
  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { recipientId: userId } }),
      prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
    ]);
    return {
      data,
      unreadCount,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, recipientId: userId },
    });
    if (!notification) throw new NotFoundError('Notification not found');
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async delete(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, recipientId: userId },
    });
    if (!notification) throw new NotFoundError('Notification not found');
    await prisma.notification.delete({ where: { id } });
  }
}

export default new NotificationService();

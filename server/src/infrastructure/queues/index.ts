import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../redis/client';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const notificationQueue = new Queue('notifications', { connection });
export const emailQueue = new Queue('emails', { connection });
export const reservationExpiryQueue = new Queue('reservation-expiry', { connection });
export const analyticsQueue = new Queue('analytics', { connection });

export async function addNotificationJob(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  await notificationQueue.add('send-notification', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

export async function addEmailJob(data: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  await emailQueue.add('send-email', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

export async function addReservationExpiryJob(data: {
  reservationId: string;
  expiresAt: Date;
}): Promise<void> {
  const delay = new Date(data.expiresAt).getTime() - Date.now();
  if (delay > 0) {
    await reservationExpiryQueue.add('check-expiry', data, {
      delay,
      attempts: 2,
    });
  }
}

export function setupWorkers(): void {
  const redis = getRedisClient();

  new Worker('reservation-expiry', async (job: Job) => {
    const { reservationId } = job.data;
    const { default: prisma } = await import('../database/prisma');
    const { emitToUser } = await import('../websocket/index');

    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (reservation && reservation.status === 'PENDING') {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { status: 'EXPIRED' },
      });
      if (reservation.resourceId) {
        await prisma.resource.update({
          where: { id: reservation.resourceId },
          data: { status: 'AVAILABLE' },
        });
      }
      emitToUser(reservation.userId, 'reservation:expired', { reservationId });
    }
  }, { connection });

  new Worker('notifications', async (job: Job) => {
    const { default: prisma } = await import('../database/prisma');
    const { emitToUser } = await import('../websocket/index');

    const notification = await prisma.notification.create({
      data: {
        recipientId: job.data.userId,
        type: job.data.type,
        title: job.data.title,
        message: job.data.message,
        relatedEntityType: job.data.relatedEntityType,
        relatedEntityId: job.data.relatedEntityId,
        metadata: job.data.metadata || {},
      },
    });

    emitToUser(job.data.userId, 'notification:new', notification);
  }, { connection });

  new Worker('emails', async (job: Job) => {
    const { sendEmail } = await import('../../shared/utils/email');
    await sendEmail(job.data.to, job.data.subject, job.data.html);
  }, { connection });
}

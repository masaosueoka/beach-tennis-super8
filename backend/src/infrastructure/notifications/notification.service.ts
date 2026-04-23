import webpush from 'web-push';
import { prisma } from '../database/prisma';
import { NotificationRepository } from '../repositories/misc.repositories';

/**
 * Notification service.
 *
 * Two transports:
 *   - DB record (Notification) — read via /notifications endpoint
 *   - Web Push (VAPID) — for real-time push to browsers/PWA
 *
 * WebSocket fan-out is handled separately in /infrastructure/websocket.
 */

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

type NotificationType = 'MATCH_RESULT' | 'RANKING_UPDATE' | 'TOURNAMENT_ANNOUNCEMENT' | 'PAYMENT' | 'GENERIC';

export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  async notify(params: {
    userId?: string | null; // null = broadcast
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    await this.repo.create({
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data as any,
      userId: params.userId ?? null,
    });

    // Web Push fan-out
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      const targets = params.userId
        ? await prisma.pushSubscription.findMany({ where: { userId: params.userId } })
        : await prisma.pushSubscription.findMany();

      const payload = JSON.stringify({
        title: params.title,
        body: params.message,
        data: params.data ?? null,
      });

      await Promise.allSettled(
        targets.map((t) =>
          webpush.sendNotification(
            { endpoint: t.endpoint, keys: t.keys as any },
            payload,
          ),
        ),
      );
    }
  }

  async saveSubscription(userId: string, endpoint: string, keys: { p256dh: string; auth: string }) {
    return prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, keys: keys as any },
      update: { userId, keys: keys as any },
    });
  }
}

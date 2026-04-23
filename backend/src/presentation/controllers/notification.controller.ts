import { Response } from 'express';
import { NotificationService } from '../../infrastructure/notifications/notification.service';
import { NotificationRepository } from '../../infrastructure/repositories/misc.repositories';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UnauthorizedError, ValidationError } from '../../domain/errors';

const notificationRepo = new NotificationRepository();
const notificationService = new NotificationService(notificationRepo);

export const NotificationController = {
  async listMine(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    const items = await notificationRepo.listForUser(req.user.id, limit);
    res.json(items);
  },

  async markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const updated = await notificationRepo.markRead(req.params.id);
    res.json(updated);
  },

  async subscribePush(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    const { endpoint, keys } = req.body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new ValidationError('endpoint and keys.{p256dh,auth} are required');
    }
    const sub = await notificationService.saveSubscription(req.user.id, endpoint, {
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    res.status(201).json({ id: sub.id });
  },

  async getVapidKey(_req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
  },
};

export { notificationService };

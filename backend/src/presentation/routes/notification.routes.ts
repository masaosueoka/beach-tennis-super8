import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requireAuth } from '../middleware/auth.middleware';

export const notificationRouter = Router();

notificationRouter.get('/vapid-key', asyncHandler(NotificationController.getVapidKey));
notificationRouter.get('/', requireAuth, asyncHandler(NotificationController.listMine));
notificationRouter.post(
  '/:id/read',
  requireAuth,
  asyncHandler(NotificationController.markRead),
);
notificationRouter.post(
  '/push/subscribe',
  requireAuth,
  asyncHandler(NotificationController.subscribePush),
);

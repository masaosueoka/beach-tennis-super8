import { Response } from 'express';
import { S3StorageService } from '../../infrastructure/storage/s3.storage';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../../domain/errors';

const storage = new S3StorageService();

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const StorageController = {
  async getPresignedUploadUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { folder, contentType } = req.body as {
      folder?: string;
      contentType?: string;
    };
    if (!folder || !['players', 'sponsors', 'generic'].includes(folder)) {
      throw new ValidationError('folder must be one of: players, sponsors, generic');
    }
    if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase())) {
      throw new ValidationError('contentType must be an image/* MIME type');
    }
    const result = await storage.getPresignedUploadUrl({
      folder: folder as 'players' | 'sponsors' | 'generic',
      contentType,
    });
    res.json(result);
  },
};

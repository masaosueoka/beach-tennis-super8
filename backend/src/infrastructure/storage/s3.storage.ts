import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * S3-compatible storage (AWS S3, Minio, Backblaze, Cloudflare R2, etc).
 *
 * Expected env:
 *   S3_ENDPOINT        — e.g. "http://minio:9000" or ""
 *   S3_REGION          — e.g. "us-east-1"
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_BUCKET          — e.g. "beach-tennis"
 *   S3_PUBLIC_BASE_URL — public URL prefix for reading (CDN or bucket)
 *   S3_FORCE_PATH_STYLE — "true" for Minio
 */

export interface StorageService {
  getPresignedUploadUrl(params: {
    folder: 'players' | 'sponsors' | 'generic';
    contentType: string;
  }): Promise<{ uploadUrl: string; publicUrl: string; key: string }>;

  deleteObject(key: string): Promise<void>;
}

export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT || undefined;
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    this.bucket = process.env.S3_BUCKET || 'beach-tennis';
    this.publicBase =
      process.env.S3_PUBLIC_BASE_URL ||
      (endpoint ? `${endpoint}/${this.bucket}` : `https://${this.bucket}.s3.${region}.amazonaws.com`);

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  async getPresignedUploadUrl(params: {
    folder: 'players' | 'sponsors' | 'generic';
    contentType: string;
  }): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    const ext = this.extensionFromContentType(params.contentType);
    const key = `${params.folder}/${randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });
    const publicUrl = `${this.publicBase}/${key}`;

    return { uploadUrl, publicUrl, key };
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  private extensionFromContentType(ct: string): string {
    switch (ct.toLowerCase()) {
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      default:
        return '';
    }
  }
}

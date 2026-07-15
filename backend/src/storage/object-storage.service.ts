import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export interface StoredObject {
  bucket: string;
  key: string;
  etag?: string;
  versionId?: string;
}

export interface PutObjectOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface StoredImage {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
}

@Injectable()
export class ObjectStorageService implements OnModuleDestroy {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor() {
    this.bucket = process.env.OBJECT_STORAGE_BUCKET ?? '';
    this.client = new S3Client({
      region: process.env.OBJECT_STORAGE_REGION ?? 'us-east-1',
      endpoint: process.env.OBJECT_STORAGE_ENDPOINT || undefined,
      forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === 'true',
      credentials:
        process.env.OBJECT_STORAGE_ACCESS_KEY_ID &&
        process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID,
              secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  isConfigured(): boolean {
    return Boolean(
      this.bucket ||
        (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    );
  }

  async put(
    key: string,
    body: Buffer,
    options: PutObjectOptions = {},
  ): Promise<StoredObject> {
    const normalizedKey = this.normalizeKey(key);
    const response = await this.client.send(
      new PutObjectCommand({
        Bucket: this.requireBucket(),
        Key: normalizedKey,
        Body: body,
        ContentLength: body.byteLength,
        ContentType: options.contentType,
        CacheControl: options.cacheControl,
        Metadata: options.metadata,
      }),
    );
    return {
      bucket: this.bucket,
      key: normalizedKey,
      etag: response.ETag,
      versionId: response.VersionId,
    };
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.requireBucket(),
        Key: this.normalizeKey(key),
      }),
    );
    if (!response.Body) throw new Error(`Object body is empty: ${key}`);
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.requireBucket(),
          Key: this.normalizeKey(key),
        }),
      );
      return true;
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (statusCode === 404) return false;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.requireBucket(),
        Key: this.normalizeKey(key),
      }),
    );
  }

  publicUrl(key: string): string | undefined {
    const base = process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(/\/+$/, '');
    if (!base) return undefined;
    return `${base}/${this.normalizeKey(key)
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/')}`;
  }

  async storeDataUrl(key: string, dataUrl: string): Promise<StoredImage> {
    const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
    if (!match) throw new Error('Generated image is not a valid data URL');
    const mimeType = match[1] || 'application/octet-stream';
    const encoded = match[3] ?? '';
    const body = match[2]
      ? Buffer.from(encoded, 'base64')
      : Buffer.from(decodeURIComponent(encoded), 'utf8');
    const normalizedKey = this.normalizeKey(key);

    if (this.bucket) {
      await this.put(normalizedKey, body, { contentType: mimeType });
      const publicUrl = this.publicUrl(normalizedKey);
      if (!publicUrl) throw new Error('OBJECT_STORAGE_PUBLIC_URL is not configured');
      return { storageKey: normalizedKey, publicUrl, mimeType };
    }

    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_GENERATED_LOGOS_BUCKET || 'catalog-logos';
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('S3-compatible or Supabase object storage is not configured');
    }
    const objectPath = normalizedKey.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: new Uint8Array(body),
      },
    );
    if (!response.ok) {
      throw new Error(`Supabase Storage upload failed: ${response.status} ${await response.text()}`);
    }
    return {
      storageKey: normalizedKey,
      publicUrl: `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(
        bucket,
      )}/${objectPath}`,
      mimeType,
    };
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  private requireBucket(): string {
    if (!this.bucket) {
      throw new Error('OBJECT_STORAGE_BUCKET is not configured');
    }
    return this.bucket;
  }

  private normalizeKey(key: string): string {
    const normalized = key.trim().replace(/^\/+/, '');
    if (!normalized || normalized.split('/').includes('..')) {
      throw new Error('Object storage key is invalid');
    }
    return normalized;
  }
}

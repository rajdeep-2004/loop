import { randomUUID } from 'node:crypto';
import { IMAGE_MIME_TYPES, LIMITS } from '@campus/shared';
import { config } from '../../config';
import { AppError, badRequest, notFound } from '../../lib/errors';
import { LocalDiskStorage, type FileStorage } from './storage';

export const PUBLIC_FILE_PREFIX = '/api/v1/files/public/';

export const storage: FileStorage = new LocalDiskStorage(config.uploadDir);

const IMAGE_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MIME_BY_EXTENSION: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Detects the real image type from the first bytes, ignoring what the client claimed. */
export function sniffImageType(data: Buffer): string | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export function assertImage(data: Buffer): string {
  if (data.length === 0) throw badRequest('empty_file', 'The file is empty');
  if (data.length > LIMITS.imageMaxBytes) {
    throw new AppError('file_too_large', 413, 'Images can be at most 5 MB');
  }
  const type = sniffImageType(data);
  if (!type || !(IMAGE_MIME_TYPES as readonly string[]).includes(type)) {
    throw badRequest('unsupported_file_type', 'Only JPEG, PNG and WebP images are allowed');
  }
  return type;
}

/** Stores a public image (avatar, banner, group image) under a random name. */
export async function savePublicImage(data: Buffer): Promise<{ url: string }> {
  const type = assertImage(data);
  const name = `${randomUUID()}.${IMAGE_EXTENSION[type]}`;
  await storage.save(`public/${name}`, data);
  return { url: `${PUBLIC_FILE_PREFIX}${name}` };
}

const PUBLIC_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

export async function readPublicImage(name: string): Promise<{ data: Buffer; contentType: string }> {
  if (!PUBLIC_NAME.test(name)) throw notFound('File');
  const data = await storage.read(`public/${name}`);
  if (!data) throw notFound('File');
  const extension = name.split('.').pop()!;
  return { data, contentType: MIME_BY_EXTENSION[extension]! };
}

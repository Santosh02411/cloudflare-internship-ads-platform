/**
 * Media Service - Handle media upload and management
 */

import { v4 as uuidv4 } from 'uuid';

class MediaService {
  constructor(mediaRepository, r2Bucket) {
    this.mediaRepository = mediaRepository;
    this.r2Bucket = r2Bucket;
  }

  async uploadMedia(userId, file) {
    const filename = file.name || `media_${Date.now()}`;
    const r2Key = `media/${userId}/${uuidv4()}/${filename}`;

    // Upload to R2
    await this.r2Bucket.put(r2Key, file, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate public URL (using Cloudflare R2 public URL format)
    const fileUrl = `https://your-r2-domain.com/${r2Key}`;

    const mediaId = `media_${uuidv4()}`;

    const media = await this.mediaRepository.create({
      id: mediaId,
      userId,
      filename,
      fileUrl,
      fileType: file.type?.includes('video') ? 'video' : 'image',
      fileSize: file.size,
      width: null,
      height: null,
      r2Key,
      metadata: {
        uploadedAt: new Date().toISOString(),
        mimeType: file.type,
      },
    });

    return media;
  }

  async getMedia(mediaId) {
    const media = await this.mediaRepository.findById(mediaId);

    if (!media) {
      throw new Error('Media not found');
    }

    return media;
  }

  async listMedia(userId, limit = 50, offset = 0) {
    return this.mediaRepository.findByUserId(userId, limit, offset);
  }

  async deleteMedia(mediaId) {
    const media = await this.mediaRepository.findById(mediaId);

    if (!media) {
      throw new Error('Media not found');
    }

    // Delete from R2
    await this.r2Bucket.delete(media.r2Key);

    // Delete from database
    await this.mediaRepository.delete(mediaId);
  }

  async deleteUserMedia(userId) {
    const mediaList = await this.mediaRepository.findByUserId(userId, 10000, 0);

    for (const media of mediaList) {
      await this.r2Bucket.delete(media.r2Key);
      await this.mediaRepository.delete(media.id);
    }
  }
}

export default MediaService;

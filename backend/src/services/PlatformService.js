/**
 * Platform Service - Handle platform integrations
 */

import { v4 as uuidv4 } from 'uuid';
import PlatformFactory from '../adapters/PlatformFactory.js';

class PlatformService {
  constructor(platformRepository) {
    this.platformRepository = platformRepository;
  }

  async connectPlatform(userId, platformType, authCode, redirectUri, env = {}) {
    // Validate platform type
    if (!PlatformFactory.isValidPlatform(platformType)) {
      throw new Error(`Invalid platform type: ${platformType}`);
    }

    // Create adapter to authenticate
    const adapter = PlatformFactory.createAdapter(platformType, 'temp_token', undefined, env);

    try {
      const authResult = await adapter.authenticate(authCode, redirectUri);

      // Check if platform already connected
      const existing = await this.platformRepository.findByUserAndType(userId, platformType);

      if (existing) {
        // Update existing connection
        await this.platformRepository.update(existing.id, {
          accessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          tokenExpiresAt: authResult.expiresAt,
          isActive: true,
        });

        return this.platformRepository.findByUserAndType(userId, platformType);
      }

      // Create new platform connection
      const platformId = `platform_${uuidv4()}`;

      const platform = await this.platformRepository.create({
        id: platformId,
        userId,
        platformType,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        tokenExpiresAt: authResult.expiresAt,
        isActive: true,
        metadata: {
          connectedAt: new Date().toISOString(),
        },
      });

      return platform;
    } catch (error) {
      throw new Error(`Failed to connect platform: ${error.message}`);
    }
  }

  async getPlatform(platformId) {
    const platform = await this.platformRepository.findById(platformId);

    if (!platform) {
      throw new Error('Platform not found');
    }

    return platform;
  }

  async listUserPlatforms(userId) {
    return this.platformRepository.findByUserId(userId);
  }

  async disconnectPlatform(userId, platformType) {
    const platform = await this.platformRepository.findByUserAndType(userId, platformType);

    if (!platform) {
      throw new Error('Platform not connected');
    }

    await this.platformRepository.update(platform.id, {
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isActive: false,
      metadata: {
        ...(platform.metadata || {}),
        disconnectedAt: new Date().toISOString(),
      },
    });
  }

  async validateConnection(platformId) {
    const platform = await this.platformRepository.findById(platformId);

    if (!platform) {
      throw new Error('Platform not found');
    }

    const adapter = PlatformFactory.createAdapter(platform.platformType, platform.accessToken, platform.refreshToken);

    const isValid = await adapter.validateConnection();

    if (!isValid) {
      await this.platformRepository.update(platformId, {
        isActive: false,
      });
    }

    return isValid;
  }

  async refreshToken(platformId) {
    const platform = await this.platformRepository.findById(platformId);

    if (!platform) {
      throw new Error('Platform not found');
    }

    if (!platform.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Mock token refresh
    const newAccessToken = `refreshed_${platform.platformType}_token_${Date.now()}`;

    await this.platformRepository.update(platformId, {
      accessToken: newAccessToken,
      tokenExpiresAt: new Date(Date.now() + 86400000),
    });

    return this.platformRepository.findById(platformId);
  }
}

export default PlatformService;

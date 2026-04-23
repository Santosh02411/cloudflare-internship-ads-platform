import { PlatformType } from '../../../shared/types/platform';
import { BasePlatformAdapter } from './BasePlatformAdapter';
import { MetaAdapter } from './MetaAdapter';
import { RealMetaAdapter } from './RealMetaAdapter';
import { GoogleAdsAdapter } from './GoogleAdsAdapter';
import { TikTokAdapter } from './TikTokAdapter';
import { LinkedInAdapter } from './LinkedInAdapter';

export class PlatformFactory {
  static createAdapter(platformType: PlatformType, accessToken: string, refreshToken?: string, env?: any): BasePlatformAdapter {
    switch (platformType) {
      case 'meta':
        // Use real Meta adapter if credentials are available, fallback to mock
        if (env?.META_APP_ID && env?.META_APP_SECRET) {
          return new RealMetaAdapter(accessToken, refreshToken, env.META_APP_ID, env.META_APP_SECRET);
        }
        return new MetaAdapter(accessToken, refreshToken);
      case 'google_ads':
        return new GoogleAdsAdapter(accessToken, refreshToken);
      case 'tiktok':
        return new TikTokAdapter(accessToken, refreshToken);
      case 'linkedin':
        return new LinkedInAdapter(accessToken, refreshToken);
      default:
        throw new Error(`Unsupported platform: ${platformType}`);
    }
  }

  static isValidPlatform(platformType: string): boolean {
    return ['meta', 'google_ads', 'tiktok', 'linkedin'].includes(platformType);
  }

  static getPlatformNames(): Record<PlatformType, string> {
    return {
      meta: 'Meta (Facebook/Instagram)',
      google_ads: 'Google Ads',
      tiktok: 'TikTok Ads',
      linkedin: 'LinkedIn Ads',
    };
  }
}

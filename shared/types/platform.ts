// Platform types
export type PlatformType = 'meta' | 'google_ads' | 'tiktok' | 'linkedin';

export const PLATFORM_NAMES: Record<PlatformType, string> = {
  meta: 'Meta (Facebook/Instagram)',
  google_ads: 'Google Ads',
  tiktok: 'TikTok Ads',
  linkedin: 'LinkedIn Ads',
};

export interface Platform {
  id: string;
  userId: string;
  platformType: PlatformType;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformConnectRequest {
  platformType: PlatformType;
  authCode: string;
  redirectUri: string;
}

export interface PlatformMetadata {
  accountName?: string;
  accountId?: string;
  email?: string;
  currency?: string;
  timezone?: string;
}

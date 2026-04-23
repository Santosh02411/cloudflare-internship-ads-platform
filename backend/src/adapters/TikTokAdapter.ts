import { BasePlatformAdapter, AdPayload, AdResponse, StatusCheckResponse } from './BasePlatformAdapter';

export class TikTokAdapter extends BasePlatformAdapter {
  private baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';

  constructor(accessToken: string, refreshToken?: string) {
    super('tiktok', accessToken, refreshToken);
  }

  async authenticate(authCode: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    try {
      console.log(`[TikTok] Authenticating with code: ${authCode}`);

      return {
        accessToken: `mock_tiktok_token_${Date.now()}`,
        refreshToken: `mock_tiktok_refresh_${Date.now()}`,
        expiresAt: new Date(Date.now() + 7200 * 1000),
      };
    } catch (error) {
      throw new Error(`TikTok authentication failed: ${error}`);
    }
  }

  async createAd(payload: AdPayload): Promise<AdResponse> {
    try {
      console.log(`[TikTok] Creating ad: ${payload.adName}`);

      const mockAdId = this.generateMockAdId();

      return {
        adId: mockAdId,
        status: 'pending',
        message: 'Ad created successfully',
        metadata: {
          platform: 'tiktok',
          createdAt: new Date().toISOString(),
          advertiserId: 'mock_advertiser_789',
          campaignId: `campaign_${mockAdId}`,
          adGroupId: `adgroup_${mockAdId}`,
          creativesId: `creative_${mockAdId}`,
        },
      };
    } catch (error) {
      return {
        adId: '',
        status: 'rejected',
        message: `Failed to create ad: ${error}`,
      };
    }
  }

  async getStatus(adId: string): Promise<StatusCheckResponse> {
    try {
      console.log(`[TikTok] Checking status for ad: ${adId}`);

      const statuses: Array<'pending' | 'approved' | 'rejected' | 'paused' | 'completed'> = ['pending', 'approved', 'rejected', 'paused', 'completed'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

      return {
        status: randomStatus,
        metadata: {
          platform: 'tiktok',
          impressions: Math.floor(Math.random() * 20000),
          clicks: Math.floor(Math.random() * 1200),
          conversions: Math.floor(Math.random() * 100),
          spend: (Math.random() * 200).toFixed(2),
          roas: (Math.random() * 5).toFixed(2),
        },
      };
    } catch (error) {
      return {
        status: 'pending',
        errorMessage: `Failed to check status: ${error}`,
      };
    }
  }

  async deleteAd(adId: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`[TikTok] Deleting ad: ${adId}`);

      return {
        success: true,
        message: 'Ad deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete ad: ${error}`,
      };
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      console.log('[TikTok] Validating connection...');
      return true;
    } catch (error) {
      console.error('[TikTok] Connection validation failed:', error);
      return false;
    }
  }
}

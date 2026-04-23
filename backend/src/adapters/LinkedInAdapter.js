/**
 * LinkedIn Ads Platform Adapter
 */

import BasePlatformAdapter from './BasePlatformAdapter.js';

class LinkedInAdapter extends BasePlatformAdapter {
  constructor(accessToken, refreshToken = null) {
    super('linkedin', accessToken, refreshToken);
    this.baseUrl = 'https://api.linkedin.com/v2';
  }

  async authenticate(authCode, redirectUri) {
    try {
      console.log(`[LinkedIn] Authenticating with code: ${authCode}`);

      return {
        accessToken: `mock_linkedin_token_${Date.now()}`,
        refreshToken: `mock_linkedin_refresh_${Date.now()}`,
        expiresAt: new Date(Date.now() + 5184000 * 1000), // 60 days
      };
    } catch (error) {
      throw new Error(`LinkedIn authentication failed: ${error.message}`);
    }
  }

  async createAd(payload) {
    try {
      console.log(`[LinkedIn] Creating ad: ${payload.adName}`);

      const mockAdId = this.generateMockAdId();

      return {
        adId: mockAdId,
        status: 'pending',
        message: 'Ad created successfully',
        metadata: {
          platform: 'linkedin',
          createdAt: new Date().toISOString(),
          accountId: 'mock_account_linkedin_123',
          campaignId: `campaign_${mockAdId}`,
          creativeId: `creative_${mockAdId}`,
          status: 'DRAFT',
        },
      };
    } catch (error) {
      return {
        adId: '',
        status: 'rejected',
        message: `Failed to create ad: ${error.message}`,
      };
    }
  }

  async getStatus(adId) {
    try {
      console.log(`[LinkedIn] Checking status for ad: ${adId}`);

      const statuses = ['pending', 'approved', 'rejected', 'paused', 'completed'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

      return {
        status: randomStatus,
        metadata: {
          platform: 'linkedin',
          impressions: Math.floor(Math.random() * 5000),
          clicks: Math.floor(Math.random() * 300),
          engagements: Math.floor(Math.random() * 150),
          spend: (Math.random() * 250).toFixed(2),
          cpc: (Math.random() * 5).toFixed(2),
        },
      };
    } catch (error) {
      return {
        status: 'pending',
        errorMessage: `Failed to check status: ${error.message}`,
      };
    }
  }

  async deleteAd(adId) {
    try {
      console.log(`[LinkedIn] Deleting ad: ${adId}`);

      return {
        success: true,
        message: 'Ad deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete ad: ${error.message}`,
      };
    }
  }

  async validateConnection() {
    try {
      console.log('[LinkedIn] Validating connection...');
      return true;
    } catch (error) {
      console.error('[LinkedIn] Connection validation failed:', error);
      return false;
    }
  }
}

export default LinkedInAdapter;

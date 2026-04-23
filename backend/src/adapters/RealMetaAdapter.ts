import { BasePlatformAdapter, AdPayload, AdResponse, StatusCheckResponse } from './BasePlatformAdapter';

interface MetaOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: string;
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
}

interface MetaAdSet {
  id: string;
  name: string;
  status: string;
}

interface MetaAd {
  id: string;
  name: string;
  status: string;
  creative: {
    id: string;
  };
}

interface MetaAdCreative {
  id: string;
  object_story_spec: {
    page_id: string;
    link_data: {
      message: string;
      link: string;
      image_hash?: string;
    };
  };
}

export class RealMetaAdapter extends BasePlatformAdapter {
  private apiVersion = 'v19.0';
  private graphBaseUrl = 'https://graph.facebook.com';
  private appId: string;
  private appSecret: string;

  constructor(accessToken: string, refreshToken?: string, appId?: string, appSecret?: string) {
    super('meta', accessToken, refreshToken);
    this.appId = appId || '';
    this.appSecret = appSecret || '';
  }

  async authenticate(authCode: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    try {
      // Exchange authorization code for access token
      const tokenUrl = `${this.graphBaseUrl}/${this.apiVersion}/oauth/access_token`;
      
      const params = new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: redirectUri,
        code: authCode,
      });

      const response = await fetch(`${tokenUrl}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Meta OAuth failed: ${response.status} - ${error}`);
      }

      const tokenData: MetaOAuthResponse = await response.json();
      
      // Get long-lived token
      const longLivedToken = await this.getLongLivedToken(tokenData.access_token);
      
      return {
        accessToken: longLivedToken.access_token,
        refreshToken: longLivedToken.access_token, // Meta uses the same token
        expiresAt: new Date(Date.now() + longLivedToken.expires_in * 1000),
      };
    } catch (error) {
      throw new Error(`Meta authentication failed: ${error}`);
    }
  }

  private async getLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
    const url = `${this.graphBaseUrl}/${this.apiVersion}/oauth/access_token`;
    
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get long-lived token');
    }

    return response.json();
  }

  async createAd(payload: AdPayload): Promise<AdResponse> {
    try {
      // 1. Get user's ad accounts
      const accounts = await this.getAdAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No ad accounts found');
      }

      const accountId = accounts[0].id;

      // 2. Create campaign
      const campaign = await this.createCampaign(accountId, payload.campaignName);
      
      // 3. Create ad set
      const adSet = await this.createAdSet(campaign.id, payload.budget || 10);
      
      // 4. Create ad creative
      const creative = await this.createAdCreative(payload);
      
      // 5. Create ad
      const ad = await this.createAdEntity(adSet.id, creative.id, payload.adName);

      return {
        adId: ad.id,
        status: 'pending',
        message: 'Ad created successfully and is pending review',
        metadata: {
          platform: 'meta',
          campaignId: campaign.id,
          adSetId: adSet.id,
          creativeId: creative.id,
          accountId: accountId,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('[Meta] Ad creation failed:', error);
      return {
        adId: '',
        status: 'rejected',
        message: `Failed to create ad: ${error}`,
      };
    }
  }

  private async getAdAccounts(): Promise<MetaAdAccount[]> {
    const url = `${this.graphBaseUrl}/${this.apiVersion}/me/adaccounts`;
    
    const response = await this.makeRequest<{ data: MetaAdAccount[] }>('GET', url);
    return response.data || [];
  }

  private async createCampaign(accountId: string, campaignName: string): Promise<MetaCampaign> {
    const url = `${this.graphBaseUrl}/${this.apiVersion}/act_${accountId}/campaigns`;
    
    const body = {
      name: campaignName,
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      special_ad_categories: [],
    };

    const response = await this.makeRequest<{ data: MetaCampaign[] }>('POST', url, body);
    return response.data[0];
  }

  private async createAdSet(campaignId: string, budget: number): Promise<MetaAdSet> {
    const url = `${this.graphBaseUrl}/${this.apiVersion}/campaign_${campaignId}/adsets`;
    
    const body = {
      name: `Ad Set - ${new Date().toISOString()}`,
      campaign_id: campaignId,
      daily_budget: budget * 100, // Meta uses cents
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LINK_CLICKS',
      targeting: {
        geo_locations: {
          countries: ['US'],
        },
      },
      status: 'PAUSED',
    };

    const response = await this.makeRequest<{ data: MetaAdSet[] }>('POST', url, body);
    return response.data[0];
  }

  private async createAdCreative(payload: AdPayload): Promise<MetaAdCreative> {
    const url = `${this.graphBaseUrl}/${this.apiVersion}/act_${this.getAccountId()}/adcreatives`;
    
    // For now, we'll create a simple link ad
    const body = {
      name: `Creative - ${payload.adName}`,
      object_story_spec: {
        page_id: this.getPageId(),
        link_data: {
          message: payload.adCopy,
          link: 'https://example.com', // You'll need to configure this
          call_to_action: {
            type: 'LEARN_MORE',
          },
        },
      },
    };

    // If media URL is provided, we'd need to upload it first and get the hash
    if (payload.mediaUrl) {
      // TODO: Implement media upload to get image_hash
      console.log('[Meta] Media upload not yet implemented');
    }

    const response = await this.makeRequest<{ data: MetaAdCreative[] }>('POST', url, body);
    return response.data[0];
  }

  private async createAdEntity(adSetId: string, creativeId: string, adName: string): Promise<MetaAd> {
    const url = `${this.graphBaseUrl}/${this.apiVersion}/adset_${adSetId}/ads`;
    
    const body = {
      name: adName,
      adset_id: adSetId,
      creative: {
        creative_id: creativeId,
      },
      status: 'PAUSED',
    };

    const response = await this.makeRequest<{ data: MetaAd[] }>('POST', url, body);
    return response.data[0];
  }

  async getStatus(adId: string): Promise<StatusCheckResponse> {
    try {
      const url = `${this.graphBaseUrl}/${this.apiVersion}/${adId}`;
      const params = new URLSearchParams({
        fields: 'status,insights{impressions,clicks,spend}',
      });

      const response = await this.makeRequest<{ status: string; insights: { data: Array<{ impressions: number; clicks: number; spend: number }> } }>('GET', `${url}?${params}`);
      
      const insights = response.insights?.data?.[0] || {};
      
      return {
        status: this.mapMetaStatus(response.status),
        metadata: {
          platform: 'meta',
          impressions: insights.impressions || 0,
          clicks: insights.clicks || 0,
          spend: insights.spend || 0,
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
      const url = `${this.graphBaseUrl}/${this.apiVersion}/${adId}`;
      
      await this.makeRequest('DELETE', url);
      
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
      const url = `${this.graphBaseUrl}/${this.apiVersion}/me`;
      const params = new URLSearchParams({
        fields: 'id,name',
      });

      await this.makeRequest('GET', `${url}?${params}`);
      return true;
    } catch (error) {
      console.error('[Meta] Connection validation failed:', error);
      return false;
    }
  }

  private mapMetaStatus(metaStatus: string): 'pending' | 'approved' | 'rejected' | 'paused' | 'completed' {
    const statusMap: Record<string, 'pending' | 'approved' | 'rejected' | 'paused' | 'completed'> = {
      'ACTIVE': 'approved',
      'PAUSED': 'paused',
      'IN_PROCESS': 'pending',
      'WITH_ISSUES': 'rejected',
      'ARCHIVED': 'completed',
    };

    return statusMap[metaStatus] || 'pending';
  }

  private getAccountId(): string {
    // This should be stored in the platform metadata when connecting
    return 'act_123456789'; // Default account - you'll need to configure this
  }

  private getPageId(): string {
    // This should be stored in the platform metadata when connecting
    return '123456789'; // Default page - you'll need to configure this
  }

  // Helper method to get OAuth URL for frontend
  getOAuthUrl(redirectUri: string): string {
    const scopes = ['ads_management', 'ads_read', 'business_management'];
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      scope: scopes.join(','),
      response_type: 'code',
    });

    return `${this.graphBaseUrl}/${this.apiVersion}/dialog/oauth?${params}`;
  }
}

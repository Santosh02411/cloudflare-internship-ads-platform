/**
 * Meta Platform Implementation
 * Professional Cloudflare internship standards with proper error handling and rate limiting
 */

import { 
  IPlatform, 
  BasePlatform, 
  PlatformCredentials, 
  AdPayload, 
  AdResponse, 
  StatusCheckResponse, 
  ValidationResult,
  RateLimitInfo,
  PlatformMetrics 
} from './IPlatform';

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: string;
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  daily_budget: number;
  targeting: Record<string, any>;
}

interface MetaAd {
  id: string;
  name: string;
  status: string;
  creative: {
    creative_id: string;
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
      call_to_action?: {
        type: string;
      };
    };
  };
}

export class MetaPlatform extends BasePlatform {
  private readonly graphBaseUrl = 'https://graph.facebook.com';
  private readonly requiredScopes = ['ads_management', 'ads_read', 'business_management'];

  constructor(credentials: PlatformCredentials) {
    super('meta', 'v19.0', 'https://graph.facebook.com', credentials);
  }

  async authenticate(authCode: string, redirectUri: string): Promise<PlatformCredentials> {
    try {
      // Exchange authorization code for access token
      const tokenUrl = `${this.graphBaseUrl}/${this.apiVersion}/oauth/access_token`;
      
      const params = new URLSearchParams({
        client_id: this.credentials.appId || '',
        client_secret: this.credentials.appSecret || '',
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

      const tokenData = await response.json() as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };
      
      // Get long-lived token
      const longLivedToken = await this.getLongLivedToken(tokenData.access_token);
      
      return {
        accessToken: longLivedToken.access_token,
        refreshToken: longLivedToken.access_token, // Meta uses the same token
        expiresAt: new Date(Date.now() + longLivedToken.expires_in * 1000),
        appId: this.credentials.appId,
        appSecret: this.credentials.appSecret,
      };
    } catch (error) {
      console.error('[Meta] Authentication failed:', error);
      throw new Error(`Meta authentication failed: ${error}`);
    }
  }

  private async getLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
    const url = `${this.graphBaseUrl}/${this.apiVersion}/oauth/access_token`;
    
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.credentials.appId || '',
      client_secret: this.credentials.appSecret || '',
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

  async publish(payload: AdPayload): Promise<AdResponse> {
    try {
      // Validate payload first
      const validation = await this.validatePayload(payload);
      if (!validation.isValid) {
        return {
          adId: '',
          status: 'rejected',
          message: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Get user's ad accounts
      const accounts = await this.getAdAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No ad accounts found');
      }

      const accountId = accounts[0].id;

      // Create campaign
      const campaign = await this.createCampaign(accountId, payload.campaignName);
      
      // Create ad set
      const adSet = await this.createAdSet(campaign.id, payload.budget || 10);
      
      // Create ad creative
      const creative = await this.createAdCreative(payload);
      
      // Create ad
      const ad = await this.createAdEntity(adSet.id, creative.id, payload.adName);

      return {
        adId: ad.id,
        status: 'pending',
        message: 'Ad created successfully and is pending review',
        metadata: {
          platform: 'meta',
          campaignId: campaign.id,
          adsetId: adSet.id,
          creativeId: creative.id,
          accountId: accountId,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('[Meta] Ad creation failed:', error);
      
      const errorHandling = await this.handleError(error);
      if (errorHandling.retryable) {
        // Retry logic would be handled by the queue consumer
        throw new Error(`Retryable error: ${errorHandling.message}`);
      }

      return {
        adId: '',
        status: 'rejected',
        message: `Failed to create ad: ${errorHandling.message}`,
      };
    }
  }

  async getStatus(adId: string): Promise<StatusCheckResponse> {
    try {
      const url = `${this.graphBaseUrl}/${this.apiVersion}/${adId}`;
      const params = new URLSearchParams({
        fields: 'status,insights{impressions,clicks,spend,ctr,cpc}',
      });

      const response = await this.makeRequest<{ 
        status: string; 
        insights: { 
          data: Array<{ 
            impressions: number; 
            clicks: number; 
            spend: number; 
            ctr: number; 
            cpc: number; 
          }> 
        } 
      }>('GET', `${url}?${params}`);
      
      const insights = response.insights?.data?.[0] || {};
      
      return {
        status: this.mapMetaStatus(response.status),
        metadata: {
          platform: 'meta',
          impressions: insights.impressions || 0,
          clicks: insights.clicks || 0,
          spend: insights.spend || 0,
          ctr: insights.ctr || 0,
          cpc: insights.cpc || 0,
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('[Meta] Status check failed:', error);
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
      console.error('[Meta] Ad deletion failed:', error);
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

  protected async performPlatformValidation(payload: AdPayload): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Meta-specific validation
    if (payload.adCopy && payload.adCopy.length > 2200) {
      errors.push('Ad copy exceeds Meta limit of 2200 characters');
    }

    if (payload.adName && payload.adName.length > 100) {
      errors.push('Ad name exceeds Meta limit of 100 characters');
    }

    if (payload.campaignName && payload.campaignName.length > 100) {
      errors.push('Campaign name exceeds Meta limit of 100 characters');
    }

    if (payload.budget && payload.budget < 1) {
      errors.push('Minimum budget is $1 per day');
    }

    if (payload.mediaUrl && !this.isValidImageUrl(payload.mediaUrl)) {
      warnings.push('Media URL may not be compatible with Meta requirements');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  protected async performTokenRefresh(): Promise<PlatformCredentials> {
    try {
      const refreshUrl = `${this.graphBaseUrl}/${this.apiVersion}/oauth/access_token`;
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.credentials.appId || '',
        client_secret: this.credentials.appSecret || '',
        refresh_token: this.credentials.refreshToken || '',
      });

      const response = await fetch(`${refreshUrl}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = await response.json();
      
      return {
        ...this.credentials,
        accessToken: tokenData.access_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      };
    } catch (error) {
      throw new Error(`Meta token refresh failed: ${error}`);
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
        age_min: 18,
        age_max: 65,
      },
      status: 'PAUSED',
    };

    const response = await this.makeRequest<{ data: MetaAdSet[] }>('POST', url, body);
    return response.data[0];
  }

  private async createAdCreative(payload: AdPayload): Promise<MetaAdCreative> {
    const url = `${this.graphBaseUrl}/${this.apiVersion}/act_${this.getAccountId()}/adcreatives`;
    
    const body: any = {
      name: `Creative - ${payload.adName}`,
      object_story_spec: {
        page_id: this.getPageId(),
        link_data: {
          message: payload.adCopy,
          link: payload.platformSpecific?.landingUrl || 'https://example.com',
          call_to_action: {
            type: payload.platformSpecific?.callToAction || 'LEARN_MORE',
          },
        },
      },
    };

    // Handle media upload if provided
    if (payload.mediaUrl) {
      try {
        const imageHash = await this.uploadImage(payload.mediaUrl);
        if (imageHash) {
          body.object_story_spec.link_data.image_hash = imageHash;
        }
      } catch (error) {
        console.warn('[Meta] Failed to upload image:', error);
      }
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

  private async uploadImage(imageUrl: string): Promise<string | null> {
    try {
      // Download image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) return null;

      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Upload to Meta
      const uploadUrl = `${this.graphBaseUrl}/${this.apiVersion}/act_${this.getAccountId()}/adimages`;
      
      const formData = new FormData();
      formData.append('file', new Blob([imageBuffer]), 'ad-image.jpg');

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) return null;

      const uploadResult = await uploadResponse.json() as { 
        images: Array<{ hash: string }> 
      };
      
      return uploadResult.images[0]?.hash || null;
    } catch (error) {
      console.error('[Meta] Image upload failed:', error);
      return null;
    }
  }

  private mapMetaStatus(metaStatus: string): 'pending' | 'approved' | 'rejected' | 'paused' | 'completed' {
    const statusMap: Record<string, 'pending' | 'approved' | 'rejected' | 'paused' | 'completed'> = {
      'ACTIVE': 'approved',
      'PAUSED': 'paused',
      'IN_PROCESS': 'pending',
      'WITH_ISSUES': 'rejected',
      'ARCHIVED': 'completed',
      'CAMPAIGN_PAUSED': 'paused',
      'ADSET_PAUSED': 'paused',
    };

    return statusMap[metaStatus] || 'pending';
  }

  private isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(urlObj.pathname);
    } catch {
      return false;
    }
  }

  private getAccountId(): string {
    // This should be stored in platform metadata when connecting
    return this.credentials.metadata?.accountId || 'act_123456789';
  }

  private getPageId(): string {
    // This should be stored in platform metadata when connecting
    return this.credentials.metadata?.pageId || '123456789';
  }

  /**
   * Get OAuth URL for frontend
   */
  getOAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.credentials.appId || '',
      redirect_uri: redirectUri,
      scope: this.requiredScopes.join(','),
      response_type: 'code',
    });

    return `${this.graphBaseUrl}/${this.apiVersion}/dialog/oauth?${params}`;
  }
}

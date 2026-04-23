import { PlatformType } from '../../../shared/types/platform';

export interface AdPayload {
  adCopy: string;
  mediaUrl?: string;
  targetAudience?: Record<string, any>;
  budget?: number;
  adName: string;
  campaignName: string;
}

export interface AdResponse {
  adId: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  metadata?: Record<string, any>;
}

export interface StatusCheckResponse {
  status: 'pending' | 'approved' | 'rejected' | 'paused' | 'completed';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export abstract class BasePlatformAdapter {
  protected accessToken: string;
  protected refreshToken?: string;
  protected platformType: PlatformType;

  constructor(platformType: PlatformType, accessToken: string, refreshToken?: string) {
    this.platformType = platformType;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  abstract authenticate(authCode: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }>;

  abstract createAd(payload: AdPayload): Promise<AdResponse>;

  abstract getStatus(adId: string): Promise<StatusCheckResponse>;

  abstract deleteAd(adId: string): Promise<{ success: boolean; message?: string }>;

  abstract validateConnection(): Promise<boolean>;

  protected async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      ...headers,
    };

    const options: RequestInit = {
      method,
      headers: defaultHeaders,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  protected generateMockAdId(): string {
    return `ad_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }

  protected normalizePlatformResponse(response: any): AdResponse {
    return {
      adId: response.adId || this.generateMockAdId(),
      status: response.status || 'pending',
      message: response.message,
      metadata: response.metadata,
    };
  }
}

/**
 * Professional Platform Integration Interface
 * Implements Cloudflare internship standards with proper TypeScript typing
 */

export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  appId?: string;
  appSecret?: string;
  metadata?: Record<string, any>;
}

export interface AdPayload {
  adCopy: string;
  mediaUrl?: string;
  targetAudience?: Record<string, any>;
  budget?: number;
  adName: string;
  campaignName: string;
  platformSpecific?: Record<string, any>;
}

export interface AdResponse {
  adId: string;
  status: 'pending' | 'approved' | 'rejected' | 'paused' | 'completed';
  message?: string;
  metadata?: {
    platform: string;
    accountId?: string;
    campaignId?: string;
    adsetId?: string;
    creativeId?: string;
    createdAt: string;
    apiResponse?: any;
  };
}

export interface StatusCheckResponse {
  status: 'pending' | 'approved' | 'rejected' | 'paused' | 'completed';
  errorMessage?: string;
  metadata?: {
    platform: string;
    impressions?: number;
    clicks?: number;
    spend?: number;
    ctr?: number;
    cpc?: number;
    lastUpdated: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  limit: number;
}

export interface PlatformMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  lastRequestTime: Date;
}

/**
 * Professional Platform Interface implementing Cloudflare best practices
 */
export interface IPlatform {
  readonly platformType: string;
  readonly apiVersion: string;
  readonly baseUrl: string;
  
  /**
   * Authenticate with platform using OAuth 2.0 flow
   */
  authenticate(authCode: string, redirectUri: string): Promise<PlatformCredentials>;
  
  /**
   * Publish ad to platform with proper validation
   */
  publish(payload: AdPayload): Promise<AdResponse>;
  
  /**
   * Check real-time status of published ad
   */
  getStatus(adId: string): Promise<StatusCheckResponse>;
  
  /**
   * Delete ad from platform
   */
  deleteAd(adId: string): Promise<{ success: boolean; message?: string }>;
  
  /**
   * Validate platform connection and credentials
   */
  validateConnection(): Promise<boolean>;
  
  /**
   * Validate ad payload against platform requirements
   */
  validatePayload(payload: AdPayload): Promise<ValidationResult>;
  
  /**
   * Get current rate limit information
   */
  getRateLimit(): Promise<RateLimitInfo | null>;
  
  /**
   * Get platform-specific metrics
   */
  getMetrics(): Promise<PlatformMetrics>;
  
  /**
   * Refresh access token if needed
   */
  refreshToken(): Promise<PlatformCredentials | null>;
  
  /**
   * Handle platform-specific errors
   */
  handleError(error: any): Promise<{ retryable: boolean; delay?: number; message?: string }>;
}

export abstract class BasePlatform implements IPlatform {
  protected credentials: PlatformCredentials;
  protected rateLimitCache: Map<string, RateLimitInfo> = new Map();
  protected metrics: PlatformMetrics = {
    totalRequests: 0,
    successRate: 0,
    averageResponseTime: 0,
    lastRequestTime: new Date(),
  };

  constructor(
    public readonly platformType: string,
    public readonly apiVersion: string,
    public readonly baseUrl: string,
    credentials: PlatformCredentials
  ) {
    this.credentials = credentials;
  }

  abstract authenticate(authCode: string, redirectUri: string): Promise<PlatformCredentials>;
  abstract publish(payload: AdPayload): Promise<AdResponse>;
  abstract getStatus(adId: string): Promise<StatusCheckResponse>;
  abstract deleteAd(adId: string): Promise<{ success: boolean; message?: string }>;
  abstract validateConnection(): Promise<boolean>;

  async validatePayload(payload: AdPayload): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!payload.adCopy || payload.adCopy.trim().length === 0) {
      errors.push('Ad copy is required');
    }

    if (!payload.adName || payload.adName.trim().length === 0) {
      errors.push('Ad name is required');
    }

    if (!payload.campaignName || payload.campaignName.trim().length === 0) {
      errors.push('Campaign name is required');
    }

    // Platform-specific validation to be implemented by subclasses
    const platformValidation = await this.performPlatformValidation(payload);
    errors.push(...platformValidation.errors);
    warnings.push(...platformValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  protected abstract performPlatformValidation(payload: AdPayload): Promise<ValidationResult>;

  async getRateLimit(): Promise<RateLimitInfo | null> {
    const cacheKey = `${this.platformType}_rate_limit`;
    return this.rateLimitCache.get(cacheKey) || null;
  }

  async getMetrics(): Promise<PlatformMetrics> {
    return { ...this.metrics };
  }

  async refreshToken(): Promise<PlatformCredentials | null> {
    if (!this.credentials.refreshToken) {
      return null;
    }

    try {
      // Implementation depends on platform
      return await this.performTokenRefresh();
    } catch (error) {
      console.error(`[${this.platformType}] Token refresh failed:`, error);
      return null;
    }
  }

  protected abstract performTokenRefresh(): Promise<PlatformCredentials>;

  async handleError(error: any): Promise<{ retryable: boolean; delay?: number; message?: string }> {
    // Default error handling logic
    if (error.status === 429) {
      return {
        retryable: true,
        delay: parseInt(error.headers?.['retry-after'] || '60') * 1000,
        message: 'Rate limited, retrying after delay',
      };
    }

    if (error.status >= 500) {
      return {
        retryable: true,
        delay: 5000,
        message: 'Server error, retrying',
      };
    }

    if (error.status === 401) {
      return {
        retryable: true,
        message: 'Authentication failed, attempting refresh',
      };
    }

    return {
      retryable: false,
      message: error.message || 'Unknown error',
    };
  }

  protected async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': `${this.platformType}-Ads-Platform/1.0`,
        'Authorization': `Bearer ${this.credentials.accessToken}`,
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

      // Update rate limit info if headers are present
      this.updateRateLimitInfo(response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`API Error: ${response.status} - ${errorText}`);
        (error as any).status = response.status;
        (error as any).headers = Object.fromEntries(response.headers.entries());
        throw error;
      }

      const result = await response.json() as T;
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, true);

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, false);
      throw error;
    }
  }

  private updateRateLimitInfo(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining');
    const resetTime = headers.get('x-ratelimit-reset');
    const limit = headers.get('x-ratelimit-limit');

    if (remaining && resetTime && limit) {
      this.rateLimitCache.set(`${this.platformType}_rate_limit`, {
        remaining: parseInt(remaining),
        resetTime: new Date(parseInt(resetTime) * 1000),
        limit: parseInt(limit),
      });
    }
  }

  private updateMetrics(responseTime: number, success: boolean): void {
    this.metrics.lastRequestTime = new Date();
    
    if (success) {
      const totalSuccess = this.metrics.totalRequests * this.metrics.successRate;
      this.metrics.successRate = (totalSuccess + 1) / this.metrics.totalRequests;
    }

    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
  }
}

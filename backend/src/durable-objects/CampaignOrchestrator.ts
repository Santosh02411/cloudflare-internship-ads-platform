/**
 * Campaign Orchestrator Durable Object
 * Professional Cloudflare internship standards with real-time status tracking and rate limiting
 */

import { PlatformType, AdPayload } from '../platforms/IPlatform';

// Cloudflare Durable Object types
interface DurableObjectState {
  storage: DurableObjectStorage;
}

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | null>;
  put(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(): AsyncIterable<[string, any]>;
}

// Cloudflare Environment interface
interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  MEDIA_BUCKET: R2Bucket;
  PUBLISH_QUEUE: Queue<any>;
  JWT_SECRET?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  CAMPAIGN_ORCHESTRATOR: DurableObject;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...args: any[]): D1PreparedStatement;
  first(): Promise<any>;
  run(): Promise<any>;
}

interface DurableObject {
  idFromName(name: string): string;
  get(id: string): DurableObjectStub;
}

interface DurableObjectStub {
  getCampaignState(campaignId: string): Promise<CampaignState | null>;
  updatePlatformStatus(
    campaignId: string, 
    platformId: string, 
    status: PlatformState['status'], 
    adId?: string, 
    errorMessage?: string,
    metrics?: PlatformState['metrics']
  ): Promise<void>;
  retryPlatform(campaignId: string, platformId: string, delay: number): Promise<void>;
}

interface CampaignState {
  id: string;
  userId: string;
  status: 'draft' | 'publishing' | 'published' | 'failed' | 'paused';
  platforms: PlatformState[];
  createdAt: Date;
  updatedAt: Date;
  publishAttempts: number;
  lastPublishAttempt?: Date;
}

interface PlatformState {
  platformId: string;
  platformType: PlatformType;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying';
  adId?: string;
  errorMessage?: string;
  lastUpdated: Date;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  metrics?: {
    impressions?: number;
    clicks?: number;
    spend?: number;
    lastChecked?: Date;
  };
}

interface RateLimitState {
  platformType: PlatformType;
  requests: number;
  resetTime: Date;
  limit: number;
  lastUsed: Date;
}

export class CampaignOrchestrator {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Initialize campaign state
   */
  async initializeCampaign(campaignId: string, userId: string, platformTypes: PlatformType[]): Promise<void> {
    const campaignState: CampaignState = {
      id: campaignId,
      userId,
      status: 'draft',
      platforms: platformTypes.map(type => ({
        platformId: '', // Will be set when connecting
        platformType: type,
        status: 'pending',
        lastUpdated: new Date(),
        retryCount: 0,
        maxRetries: 3,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      publishAttempts: 0,
    };

    await this.state.storage.put(`campaign:${campaignId}`, campaignState);
    console.log(`[Orchestrator] Campaign ${campaignId} initialized for ${platformTypes.length} platforms`);
  }

  /**
   * Start publishing campaign to all platforms
   */
  async startPublishing(campaignId: string, userId: string): Promise<void> {
    const campaignState = await this.getCampaignState(campaignId);
    
    if (!campaignState) {
      throw new Error('Campaign not found');
    }

    if (campaignState.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (campaignState.status !== 'draft') {
      throw new Error('Campaign is already being published');
    }

    // Update status to publishing
    campaignState.status = 'publishing';
    campaignState.publishAttempts++;
    campaignState.lastPublishAttempt = new Date();
    campaignState.updatedAt = new Date();

    // Mark all platforms as in_progress
    campaignState.platforms.forEach(platform => {
      if (platform.status === 'pending') {
        platform.status = 'in_progress';
        platform.lastUpdated = new Date();
      }
    });

    await this.state.storage.put(`campaign:${campaignId}`, campaignState);

    // Queue publishing jobs for each platform
    await this.queuePlatformJobs(campaignId, campaignState);

    console.log(`[Orchestrator] Started publishing campaign ${campaignId}`);
  }

  /**
   * Update platform status from queue worker
   */
  async updatePlatformStatus(
    campaignId: string, 
    platformId: string, 
    status: PlatformState['status'], 
    adId?: string, 
    errorMessage?: string,
    metrics?: PlatformState['metrics']
  ): Promise<void> {
    const campaignState = await this.getCampaignState(campaignId);
    if (!campaignState) return;

    const platform = campaignState.platforms.find(p => p.platformId === platformId);
    if (!platform) return;

    platform.status = status;
    platform.lastUpdated = new Date();
    
    if (adId) platform.adId = adId;
    if (errorMessage) platform.errorMessage = errorMessage;
    if (metrics) platform.metrics = metrics;

    // Update campaign overall status
    campaignState.status = this.calculateCampaignStatus(campaignState.platforms);
    campaignState.updatedAt = new Date();

    await this.state.storage.put(`campaign:${campaignId}`, campaignState);

    console.log(`[Orchestrator] Updated ${campaignId}/${platformId} to ${status}`);
  }

  /**
   * Handle platform retry
   */
  async retryPlatform(campaignId: string, platformId: string, delay: number): Promise<void> {
    const campaignState = await this.getCampaignState(campaignId);
    if (!campaignState) return;

    const platform = campaignState.platforms.find(p => p.platformId === platformId);
    if (!platform) return;

    platform.status = 'retrying';
    platform.retryCount++;
    platform.nextRetryAt = new Date(Date.now() + delay);
    platform.lastUpdated = new Date();

    await this.state.storage.put(`campaign:${campaignId}`, campaignState);

    // Re-queue the job
    await this.requeuePlatformJob(campaignId, platform);

    console.log(`[Orchestrator] Retrying ${campaignId}/${platformId} in ${delay}ms`);
  }

  /**
   * Get campaign state
   */
  async getCampaignState(campaignId: string): Promise<CampaignState | null> {
    return await this.state.storage.get(`campaign:${campaignId}`);
  }

  /**
   * Get all campaigns for user
   */
  async getUserCampaigns(userId: string): Promise<CampaignState[]> {
    const campaigns: CampaignState[] = [];
    
    for await (const [key, value] of this.state.storage.list()) {
      if (key.startsWith('campaign:') && value.userId === userId) {
        campaigns.push(value);
      }
    }

    return campaigns.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Check rate limits before platform operations
   */
  async checkRateLimit(platformType: PlatformType): Promise<{ allowed: boolean; waitTime?: number }> {
    const rateLimitKey = `rate_limit:${platformType}`;
    const rateLimit = await this.state.storage.get<RateLimitState>(rateLimitKey);

    if (!rateLimit) {
      return { allowed: true };
    }

    const now = new Date();
    
    if (now < rateLimit.resetTime) {
      const waitTime = rateLimit.resetTime.getTime() - now.getTime();
      return { allowed: false, waitTime };
    }

    return { allowed: true };
  }

  /**
   * Update rate limit after platform operation
   */
  async updateRateLimit(platformType: PlatformType, limit: number, resetTime: Date): Promise<void> {
    const rateLimitKey = `rate_limit:${platformType}`;
    const currentRateLimit = await this.state.storage.get<RateLimitState>(rateLimitKey);

    const rateLimitState: RateLimitState = {
      platformType,
      requests: (currentRateLimit?.requests || 0) + 1,
      limit,
      resetTime,
      lastUsed: new Date(),
    };

    await this.state.storage.put(rateLimitKey, rateLimitState);
  }

  /**
   * Get platform metrics
   */
  async getPlatformMetrics(campaignId: string, platformId: string): Promise<PlatformState['metrics'] | null> {
    const campaignState = await this.getCampaignState(campaignId);
    if (!campaignState) return null;

    const platform = campaignState.platforms.find(p => p.platformId === platformId);
    return platform?.metrics || null;
  }

  /**
   * Clean up old campaign states
   */
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = new Date(Date.now() - maxAge);
    let cleaned = 0;

    for await (const [key, value] of this.state.storage.list()) {
      if (key.startsWith('campaign:') && value.updatedAt < cutoff) {
        await this.state.storage.delete(key);
        cleaned++;
      }
    }

    console.log(`[Orchestrator] Cleaned up ${cleaned} old campaign states`);
  }

  /**
   * Queue publishing jobs for all platforms
   */
  private async queuePlatformJobs(campaignId: string, campaignState: CampaignState): Promise<void> {
    const { PublishQueue } = await import('../queue/PublishQueue.js');
    const publishQueue = new PublishQueue(this.env.PUBLISH_QUEUE);

    for (const platform of campaignState.platforms) {
      if (platform.status === 'in_progress') {
        // Get campaign details from database
        const campaign = await this.env.DB.prepare(
          'SELECT * FROM campaigns WHERE id = ?'
        ).bind(campaignId).first();

        if (!campaign) continue;

        const job = {
          campaignId,
          platformId: platform.platformId,
          platformType: platform.platformType,
          payload: {
            adCopy: campaign.ad_copy,
            adName: campaign.name,
            campaignName: campaign.name,
            budget: campaign.budget,
            mediaUrl: campaign.media_id, // Would need to get actual URL
          },
          userId: campaignState.userId,
          priority: 'medium' as const,
        };

        await publishQueue.addJob(job);
      }
    }
  }

  /**
   * Re-queue a single platform job
   */
  private async requeuePlatformJob(campaignId: string, platform: PlatformState): Promise<void> {
    const { PublishQueue } = await import('../queue/PublishQueue.js');
    const publishQueue = new PublishQueue(this.env.PUBLISH_QUEUE);

    const campaign = await this.env.DB.prepare(
      'SELECT * FROM campaigns WHERE id = ?'
    ).bind(campaignId).first();

    if (!campaign) return;

    const job = {
      campaignId,
      platformId: platform.platformId,
      platformType: platform.platformType,
      payload: {
        adCopy: campaign.ad_copy,
        adName: campaign.name,
        campaignName: campaign.name,
        budget: campaign.budget,
        mediaUrl: campaign.media_id,
      },
      userId: platform.platformId, // This would come from campaign state
      priority: 'medium' as const,
    };

    await publishQueue.scheduleJob(job, platform.nextRetryAt || new Date());
  }

  /**
   * Calculate overall campaign status from platform statuses
   */
  private calculateCampaignStatus(platforms: PlatformState[]): CampaignState['status'] {
    const statuses = platforms.map(p => p.status);
    
    // If any platform is in_progress or retrying, campaign is publishing
    if (statuses.some(s => s === 'in_progress' || s === 'retrying')) {
      return 'publishing';
    }

    // If all platforms are completed, campaign is published
    if (statuses.every(s => s === 'completed')) {
      return 'published';
    }

    // If any platform failed, campaign is failed
    if (statuses.some(s => s === 'failed')) {
      return 'failed';
    }

    // If all platforms are pending, campaign is draft
    if (statuses.every(s => s === 'pending')) {
      return 'draft';
    }

    // Default to publishing for mixed states
    return 'publishing';
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get('campaignId');
    const userId = url.searchParams.get('userId');

    if (!campaignId || !userId) {
      return new Response('Missing campaignId or userId', { status: 400 });
    }

    const id = env.CAMPAIGN_ORCHESTRATOR.idFromName(campaignId);
    const stub = env.CAMPAIGN_ORCHESTRATOR.get(id);

    switch (url.pathname) {
      case '/status':
        const campaignState = await stub.getCampaignState(campaignId);
        return Response.json(campaignState);

      case '/update':
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }

        const body = await request.json() as {
          platformId: string;
          status: PlatformState['status'];
          adId?: string;
          errorMessage?: string;
          metrics?: PlatformState['metrics'];
        };

        await stub.updatePlatformStatus(
          campaignId,
          body.platformId,
          body.status,
          body.adId,
          body.errorMessage,
          body.metrics
        );

        return Response.json({ success: true });

      case '/retry':
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }

        const retryBody = await request.json() as {
          platformId: string;
          delay: number;
        };

        await stub.retryPlatform(campaignId, retryBody.platformId, retryBody.delay);
        return Response.json({ success: true });

      default:
        return new Response('Not found', { status: 404 });
    }
  },
};

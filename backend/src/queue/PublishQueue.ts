/**
 * Professional Async Publishing Queue System
 * Implements Cloudflare internship standards with proper error handling and retries
 */

import { AdPayload, AdResponse } from '../platforms/IPlatform';

// Define PlatformType as a union of supported platforms
type PlatformType = 'meta' | 'google_ads' | 'tiktok' | 'linkedin';

// Cloudflare Queue types
interface Queue<T> {
  send(message: any): Promise<void>;
}

interface MessageSendRequest<T> {
  body: T;
  ack(): void;
  retry(): void;
}

// Cloudflare Environment interface
interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  MEDIA_BUCKET: R2Bucket;
  PUBLISH_QUEUE: Queue<PublishJob>;
  JWT_SECRET?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...args: any[]): D1PreparedStatement;
  first(): Promise<any>;
  run(): Promise<D1Result>;
  all(): Promise<any[]>;
}

interface D1Result {
  success: boolean;
  meta: any;
}

export interface PublishJob {
  id: string;
  campaignId: string;
  platformId: string;
  platformType: PlatformType;
  payload: AdPayload;
  userId: string;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  createdAt: Date;
  scheduledAt?: Date;
}

export interface QueueStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
}

export class PublishQueue {
  private queue: Queue<PublishJob>;
  private stats: QueueStats = {
    totalJobs: 0,
    pendingJobs: 0,
    processingJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
  };

  constructor(queue: Queue<PublishJob>) {
    this.queue = queue;
  }

  /**
   * Add job to queue with proper validation and priority
   */
  async addJob(job: Omit<PublishJob, 'id' | 'createdAt' | 'retryCount' | 'maxRetries'>): Promise<string> {
    const jobId = `job_${crypto.randomUUID()}`;
    
    const fullJob: PublishJob = {
      ...job,
      id: jobId,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      priority: job.priority || 'medium',
    };

    // Validate job before queuing
    const validation = this.validateJob(fullJob);
    if (!validation.isValid) {
      throw new Error(`Invalid job: ${validation.errors.join(', ')}`);
    }

    // Send to Cloudflare Queue
    await this.queue.send({
      id: jobId,
      ...fullJob,
      timestamp: Date.now(),
    });

    this.updateStats('added');
    
    console.log(`[Queue] Job ${jobId} added for ${job.platformType}`);
    return jobId;
  }

  /**
   * Schedule job for future processing
   */
  async scheduleJob(
    job: Omit<PublishJob, 'id' | 'createdAt' | 'retryCount' | 'maxRetries'>,
    scheduledAt: Date
  ): Promise<string> {
    const jobId = await this.addJob({
      ...job,
      scheduledAt,
    });

    console.log(`[Queue] Job ${jobId} scheduled for ${scheduledAt.toISOString()}`);
    return jobId;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Process batch of jobs from queue
   */
  async processBatch(batch: MessageSendRequest<PublishJob>[], env: Env): Promise<void> {
    const processingPromises = batch.map(async (message) => {
      try {
        await this.processJob(message.body, env);
        message.ack();
        this.updateStats('completed');
      } catch (error) {
        console.error(`[Queue] Job ${message.body.id} failed:`, error);
        
        const shouldRetry = await this.handleJobFailure(message.body, error);
        if (shouldRetry) {
          message.retry();
          this.updateStats('retry');
        } else {
          message.ack();
          this.updateStats('failed');
        }
      }
    });

    await Promise.allSettled(processingPromises);
  }

  /**
   * Process individual job
   */
  private async processJob(job: PublishJob, env: Env): Promise<void> {
    const startTime = Date.now();
    
    console.log(`[Queue] Processing job ${job.id} for ${job.platformType}`);

    // Check if job is scheduled for future
    if (job.scheduledAt && job.scheduledAt > new Date()) {
      console.log(`[Queue] Job ${job.id} scheduled for future, re-queueing`);
      await this.queue.send({
        ...job,
        timestamp: Date.now(),
      });
      return;
    }

    // Get platform instance
    const platform = await this.getPlatformInstance(job.platformType, job.platformId, env);
    if (!platform) {
      throw new Error(`Platform ${job.platformType} not available`);
    }

    // Validate payload
    const validation = await platform.validatePayload(job.payload);
    if (!validation.isValid) {
      throw new Error(`Payload validation failed: ${validation.errors.join(', ')}`);
    }

    // Publish to platform
    const result = await platform.publish(job.payload);
    
    if (!result.adId) {
      throw new Error(`Platform returned no ad ID: ${result.message}`);
    }

    // Update campaign status in database
    await this.updateCampaignStatus(job, result, env);
    
    const processingTime = Date.now() - startTime;
    console.log(`[Queue] Job ${job.id} completed in ${processingTime}ms`);
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(job: PublishJob, error: any): Promise<boolean> {
    job.retryCount++;

    // Check if we should retry
    if (job.retryCount < job.maxRetries) {
      // Calculate exponential backoff
      const delay = Math.min(1000 * Math.pow(2, job.retryCount), 30000);
      job.nextRetryAt = new Date(Date.now() + delay);

      console.log(`[Queue] Retrying job ${job.id} in ${delay}ms (attempt ${job.retryCount})`);
      
      // Re-queue with delay
      await this.queue.send({
        ...job,
        timestamp: Date.now(),
      });

      return true;
    }

    // Max retries exceeded, mark as permanently failed
    console.error(`[Queue] Job ${job.id} failed permanently after ${job.retryCount} attempts`);
    await this.markJobFailed(job, error);
    
    return false;
  }

  /**
   * Get platform instance for job
   */
  private async getPlatformInstance(platformType: PlatformType, platformId: string, env: Env): Promise<any> {
    try {
      // Import PlatformFactory dynamically
      const { PlatformFactory } = await import('../adapters/PlatformFactory.js');
      
      // Get platform credentials from database
      const platform = await env.DB.prepare(
        'SELECT * FROM platforms WHERE id = ?'
      ).bind(platformId).first();

      if (!platform) {
        console.error(`[Queue] Platform ${platformId} not found in database`);
        return null;
      }

      return PlatformFactory.createAdapter(platformType, platform.access_token, platform.refresh_token, env);
    } catch (error) {
      console.error(`[Queue] Failed to get platform instance:`, error);
      return null;
    }
  }

  /**
   * Update campaign status in database
   */
  private async updateCampaignStatus(job: PublishJob, result: AdResponse, env: Env): Promise<void> {
    try {
      await env.DB.prepare(`
        UPDATE campaign_platforms 
        SET status = ?, ad_id = ?, api_response = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
        WHERE campaign_id = ? AND platform_id = ?
      `).bind(
        result.status,
        result.adId,
        JSON.stringify(result.metadata),
        result.message || null,
        job.campaignId,
        job.platformId
      ).run();

      // Log to audit table
      await env.DB.prepare(`
        INSERT INTO audit_logs (id, campaign_id, platform_id, action, status, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        crypto.randomUUID(),
        job.campaignId,
        job.platformId,
        'publish',
        result.status,
        JSON.stringify({
          adId: result.adId,
          message: result.message,
          processingTime: Date.now(),
        })
      ).run();

    } catch (error) {
      console.error(`[Queue] Failed to update campaign status:`, error);
    }
  }

  /**
   * Mark job as permanently failed
   */
  private async markJobFailed(job: PublishJob, error: any, env: Env): Promise<void> {
    try {
      await env.DB.prepare(`
        UPDATE campaign_platforms 
        SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
        WHERE campaign_id = ? AND platform_id = ?
      `).bind(
        `Failed after ${job.retryCount} attempts: ${error.message}`,
        job.campaignId,
        job.platformId
      ).run();

      // Log to audit table
      await env.DB.prepare(`
        INSERT INTO audit_logs (id, campaign_id, platform_id, action, status, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        crypto.randomUUID(),
        job.campaignId,
        job.platformId,
        'publish_failed',
        'failed',
        JSON.stringify({
          error: error.message,
          retryCount: job.retryCount,
          maxRetries: job.maxRetries,
        })
      ).run();

    } catch (dbError) {
      console.error(`[Queue] Failed to mark job as failed:`, dbError);
    }
  }

  /**
   * Validate job before queuing
   */
  private validateJob(job: PublishJob): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!job.campaignId) {
      errors.push('Campaign ID is required');
    }

    if (!job.platformId) {
      errors.push('Platform ID is required');
    }

    if (!job.platformType) {
      errors.push('Platform type is required');
    }

    if (!job.payload) {
      errors.push('Payload is required');
    }

    if (!job.userId) {
      errors.push('User ID is required');
    }

    // Validate payload structure
    if (job.payload) {
      if (!job.payload.adCopy) {
        errors.push('Ad copy is required');
      }

      if (!job.payload.adName) {
        errors.push('Ad name is required');
      }

      if (!job.payload.campaignName) {
        errors.push('Campaign name is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update queue statistics
   */
  private updateStats(action: 'added' | 'completed' | 'failed' | 'retry'): void {
    this.stats.totalJobs++;

    switch (action) {
      case 'added':
        this.stats.pendingJobs++;
        break;
      case 'completed':
        this.stats.pendingJobs--;
        this.stats.processingJobs--;
        this.stats.completedJobs++;
        break;
      case 'failed':
        this.stats.pendingJobs--;
        this.stats.processingJobs--;
        this.stats.failedJobs++;
        break;
      case 'retry':
        this.stats.pendingJobs++;
        this.stats.processingJobs--;
        break;
    }
  }
}

/**
 * Queue Worker - Process publishing jobs
 */

import PlatformFactory from '../adapters/PlatformFactory.js';

class QueueWorker {
  constructor(jobRepository, campaignPlatformRepository, platformRepository, campaignRepository) {
    this.jobRepository = jobRepository;
    this.campaignPlatformRepository = campaignPlatformRepository;
    this.platformRepository = platformRepository;
    this.campaignRepository = campaignRepository;
  }

  async processJob(message) {
    try {
      const { type, jobId, payload, retryCount } = message;

      if (type === 'publish_ad' || type === 'publish_ad_retry') {
        return this.publishAd(jobId, payload, retryCount);
      }

      console.warn(`Unknown message type: ${type}`);
      return { success: false, error: 'Unknown message type' };
    } catch (error) {
      console.error('Worker error:', error);
      throw error;
    }
  }

  async publishAd(jobId, payload, retryCount = 0) {
    try {
      // Get job details
      const job = await this.jobRepository.findById(jobId);

      if (!job) {
        console.error(`Job ${jobId} not found`);
        return { success: false, error: 'Job not found' };
      }

      // Get platform
      const platform = await this.platformRepository.findById(payload.platformId);

      if (!platform) {
        await this.failJob(jobId, 'Platform not found');
        return { success: false, error: 'Platform not found' };
      }

      // Get adapter
      const adapter = PlatformFactory.createAdapter(
        payload.platformType,
        platform.accessToken,
        platform.refreshToken
      );

      // Create ad on platform
      const adResponse = await adapter.createAd({
        adCopy: payload.adCopy,
        mediaUrl: payload.mediaUrl,
        budget: payload.budget,
        adName: payload.adName,
      });

      // Check if ad creation was successful
      if (adResponse.status === 'rejected') {
        const nextRetryTime = Date.now() + Math.pow(2, retryCount) * 1000;

        if (retryCount < job.maxRetries) {
          await this.jobRepository.update(jobId, {
            status: 'retrying',
            retryCount: retryCount + 1,
            nextRetryAt: new Date(nextRetryTime),
            errorMessage: adResponse.message,
          });

          return {
            success: false,
            error: adResponse.message,
            retrying: true,
            nextRetryTime,
          };
        } else {
          await this.failJob(jobId, `Max retries exceeded: ${adResponse.message}`);
          return { success: false, error: `Max retries exceeded: ${adResponse.message}` };
        }
      }

      // Update job with success
      const now = new Date();
      await this.jobRepository.update(jobId, {
        status: 'completed',
        result: adResponse,
        completedAt: now,
      });

      // Update campaign platform
      await this.campaignPlatformRepository.update(job.campaignPlatformId, {
        status: 'success',
        adId: adResponse.adId,
        apiResponse: JSON.stringify(adResponse),
      });

      // Check if all platforms are done
      await this.checkCampaignCompletion(job.campaignId);

      console.log(`Job ${jobId} completed successfully`);

      return { success: true, adId: adResponse.adId };
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);

      const job = await this.jobRepository.findById(jobId);

      if (job && retryCount < job.maxRetries) {
        const nextRetryTime = Date.now() + Math.pow(2, retryCount) * 1000;

        await this.jobRepository.update(jobId, {
          status: 'retrying',
          retryCount: retryCount + 1,
          nextRetryAt: new Date(nextRetryTime),
          errorMessage: error.message,
        });

        return {
          success: false,
          error: error.message,
          retrying: true,
          nextRetryTime,
        };
      }

      await this.failJob(jobId, error.message);

      return { success: false, error: error.message };
    }
  }

  async failJob(jobId, errorMessage) {
    const job = await this.jobRepository.findById(jobId);

    await this.jobRepository.update(jobId, {
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    });

    await this.campaignPlatformRepository.update(job.campaignPlatformId, {
      status: 'failed',
      errorMessage,
    });
  }

  async checkCampaignCompletion(campaignId) {
    const campaign = await this.campaignRepository.findById(campaignId);
    const platforms = await this.campaignPlatformRepository.findByCampaignId(campaignId);

    const allCompleted = platforms.every((p) => p.status === 'success' || p.status === 'failed');

    if (allCompleted) {
      const allSuccess = platforms.every((p) => p.status === 'success');

      await this.campaignRepository.update(campaignId, {
        status: allSuccess ? 'running' : 'failed',
      });

      console.log(`Campaign ${campaignId} status updated to ${allSuccess ? 'running' : 'failed'}`);
    }
  }
}

export default QueueWorker;

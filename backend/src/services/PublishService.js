/**
 * Publish Service - Handle campaign publishing to platforms
 */

import { v4 as uuidv4 } from 'uuid';
import PlatformFactory from '../adapters/PlatformFactory.js';

class PublishService {
  constructor(campaignRepository, campaignPlatformRepository, platformRepository, jobRepository, publishQueue, kvService) {
    this.campaignRepository = campaignRepository;
    this.campaignPlatformRepository = campaignPlatformRepository;
    this.platformRepository = platformRepository;
    this.jobRepository = jobRepository;
    this.publishQueue = publishQueue;
    this.kvService = kvService;
  }

  async publishCampaign(campaignId) {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const campaignPlatforms = await this.campaignPlatformRepository.findByCampaignId(campaignId);

    if (campaignPlatforms.length === 0) {
      throw new Error('No platforms associated with campaign');
    }

    // Create publishing jobs for each platform
    const jobs = [];

    for (const campaignPlatform of campaignPlatforms) {
      const platform = await this.platformRepository.findById(campaignPlatform.platformId);

      if (!platform || !platform.isActive) {
        await this.campaignPlatformRepository.update(campaignPlatform.id, {
          status: 'failed',
          errorMessage: 'Platform not connected or inactive',
        });
        continue;
      }

      const jobId = `job_${uuidv4()}`;
      const payload = {
        campaignId,
        platformId: platform.id,
        platformType: platform.platformType,
        adCopy: campaign.adCopy,
        mediaUrl: campaign.mediaId ? `https://media.example.com/${campaign.mediaId}` : null,
        budget: campaign.budget,
        adName: campaign.name,
      };

      const job = await this.jobRepository.create({
        id: jobId,
        campaignId,
        campaignPlatformId: campaignPlatform.id,
        status: 'pending',
        payload,
        retryCount: 0,
        maxRetries: 3,
      });

      jobs.push(job);

      // Add to publish queue
      try {
        await this.publishQueue.send({
          type: 'publish_ad',
          jobId: job.id,
          payload: job.payload,
        });
      } catch (error) {
        console.error('Failed to send job to queue:', error);
        await this.jobRepository.update(jobId, {
          status: 'failed',
          errorMessage: `Queue error: ${error.message}`,
        });
        await this.campaignPlatformRepository.update(campaignPlatform.id, {
          status: 'failed',
          errorMessage: `Queue error: ${error.message}`,
        });
      }
    }

    // Update campaign status to scheduled
    await this.campaignRepository.update(campaignId, {
      status: 'scheduled',
    });

    return jobs;
  }

  async getPublishingStatus(campaignId) {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const platforms = await this.campaignPlatformRepository.findByCampaignId(campaignId);
    const jobs = await this.jobRepository.findByCampaignId(campaignId);

    let successCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    for (const platform of platforms) {
      if (platform.status === 'success') successCount++;
      if (platform.status === 'failed') failedCount++;
      if (platform.status === 'pending') pendingCount++;
    }

    const totalPlatforms = platforms.length;
    const overallProgress = totalPlatforms > 0 ? Math.round(((successCount + failedCount) / totalPlatforms) * 100) : 0;

    return {
      campaignId,
      campaignName: campaign.name,
      status: campaign.status,
      platforms,
      jobs,
      summary: {
        total: totalPlatforms,
        success: successCount,
        failed: failedCount,
        pending: pendingCount,
        overallProgress,
      },
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      publishedAt: campaign.publishedAt,
    };
  }

  async retryFailedPublish(campaignId) {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const jobs = await this.jobRepository.findByCampaignId(campaignId);
    const failedJobs = jobs.filter((j) => j.status === 'failed' && j.retryCount < j.maxRetries);

    for (const job of failedJobs) {
      await this.jobRepository.update(job.id, {
        status: 'retrying',
        retryCount: job.retryCount + 1,
        nextRetryAt: new Date(Date.now() + Math.pow(2, job.retryCount) * 1000),
      });

      // Re-add to queue
      await this.publishQueue.send({
        type: 'publish_ad',
        jobId: job.id,
        payload: job.payload,
        retry: true,
      });
    }

    return {
      message: `Retry initiated for ${failedJobs.length} failed jobs`,
      jobsRetrying: failedJobs.length,
    };
  }

  async cancelPublish(campaignId) {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const jobs = await this.jobRepository.findByCampaignId(campaignId);
    const pendingJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'retrying');

    for (const job of pendingJobs) {
      await this.jobRepository.update(job.id, {
        status: 'failed',
        errorMessage: 'Campaign publishing cancelled',
      });
    }

    await this.campaignRepository.update(campaignId, {
      status: 'paused',
    });

    return {
      message: `Publishing cancelled for campaign ${campaignId}`,
      jobsCancelled: pendingJobs.length,
    };
  }
}

export default PublishService;

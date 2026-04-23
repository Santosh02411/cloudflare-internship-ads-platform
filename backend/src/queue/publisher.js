/**
 * Queue Publisher - Handle sending jobs to the queue
 */

class QueuePublisher {
  constructor(publishQueue) {
    this.publishQueue = publishQueue;
  }

  async publishJob(job) {
    try {
      const message = {
        type: 'publish_ad',
        jobId: job.id,
        campaignId: job.campaignId,
        campaignPlatformId: job.campaignPlatformId,
        platformType: job.platformType,
        payload: job.payload,
        retryCount: job.retryCount,
        timestamp: new Date().toISOString(),
      };

      await this.publishQueue.send(message);

      console.log(`Job ${job.id} published to queue`);
      return true;
    } catch (error) {
      console.error(`Failed to publish job ${job.id}:`, error);
      throw error;
    }
  }

  async publishBatch(jobs) {
    const messages = jobs.map((job) => ({
      body: {
        type: 'publish_ad',
        jobId: job.id,
        campaignId: job.campaignId,
        campaignPlatformId: job.campaignPlatformId,
        platformType: job.platformType,
        payload: job.payload,
        retryCount: job.retryCount,
        timestamp: new Date().toISOString(),
      },
    }));

    try {
      await this.publishQueue.sendBatch(messages);
      console.log(`${messages.length} jobs published to queue`);
      return true;
    } catch (error) {
      console.error(`Failed to publish batch:`, error);
      throw error;
    }
  }

  async publishRetry(job, delay = 1000) {
    try {
      const exponentialBackoff = Math.pow(2, job.retryCount) * 1000;
      const nextRetryTime = Date.now() + exponentialBackoff;

      const message = {
        type: 'publish_ad_retry',
        jobId: job.id,
        campaignId: job.campaignId,
        campaignPlatformId: job.campaignPlatformId,
        platformType: job.platformType,
        payload: job.payload,
        retryCount: job.retryCount,
        nextRetryTime,
        timestamp: new Date().toISOString(),
      };

      await this.publishQueue.send(message);

      console.log(`Retry job ${job.id} scheduled with ${exponentialBackoff}ms backoff`);
      return true;
    } catch (error) {
      console.error(`Failed to publish retry:`, error);
      throw error;
    }
  }
}

export default QueuePublisher;

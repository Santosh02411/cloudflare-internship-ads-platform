// Job types
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
export type PlatformStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface PublishingJob {
  id: string;
  campaignId: string;
  campaignPlatformId: string;
  status: JobStatus;
  payload: Record<string, any>;
  result?: Record<string, any>;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface JobPayload {
  campaignId: string;
  platformId: string;
  platformType: string;
  adCopy: string;
  mediaUrl?: string;
  targetAudience?: Record<string, any>;
  budget?: number;
}

export interface CampaignPlatformStatus {
  campaignPlatformId: string;
  platformType: string;
  status: PlatformStatus;
  adId?: string;
  errorMessage?: string;
  retryCount: number;
  updatedAt: Date;
}

export interface CampaignStatusResponse {
  campaignId: string;
  campaignName: string;
  status: string;
  platforms: CampaignPlatformStatus[];
  overallProgress: number;
  createdAt: Date;
  updatedAt: Date;
}

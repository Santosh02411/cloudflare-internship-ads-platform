// Campaign types
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';
export type ABVariant = 'control' | 'variant_a' | 'variant_b';

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  adCopy: string;
  mediaId?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  status: CampaignStatus;
  abVariant?: ABVariant;
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface CampaignCreateRequest {
  name: string;
  description?: string;
  adCopy: string;
  mediaId?: string;
  platforms: string[];
  startDate?: string;
  endDate?: string;
  budget?: number;
  abVariant?: ABVariant;
  templateId?: string;
}

export interface CampaignUpdateRequest {
  name?: string;
  description?: string;
  adCopy?: string;
  status?: CampaignStatus;
  budget?: number;
}

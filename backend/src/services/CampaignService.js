/**
 * Campaign Service - Handle campaign business logic
 */

import { v4 as uuidv4 } from 'uuid';
import { validateCampaignName, validateAdCopy, validateBudget, validatePlatforms, mergeValidationResults } from '../utils/validators.js';

class CampaignService {
  constructor(campaignRepository, campaignPlatformRepository, platformRepository) {
    this.campaignRepository = campaignRepository;
    this.campaignPlatformRepository = campaignPlatformRepository;
    this.platformRepository = platformRepository;
  }

  async createCampaign(userId, campaignData) {
    const nameValidation = validateCampaignName(campaignData.name);
    const adCopyValidation = validateAdCopy(campaignData.adCopy);
    const budgetValidation = campaignData.budget ? validateBudget(campaignData.budget) : null;
    const platformValidation = validatePlatforms(campaignData.platforms || []);

    const validations = [nameValidation, adCopyValidation, platformValidation];
    if (budgetValidation) validations.push(budgetValidation);

    const result = mergeValidationResults(...validations);

    if (!result.isValid()) {
      const errors = result.getErrors();
      throw new Error(`Validation failed: ${errors.map((e) => e.message).join(', ')}`);
    }

    const connectedPlatforms = [];

    for (const platformType of campaignData.platforms) {
      const platform = await this.platformRepository.findByUserAndType(userId, platformType);

      if (!platform || !platform.isActive) {
        throw new Error(
          `Platform ${platformType} is not connected. Connect it from the Platforms page before creating this campaign.`
        );
      }

      connectedPlatforms.push({
        platformType,
        platformId: platform.id,
      });
    }

    const campaignId = `campaign_${uuidv4()}`;

    const campaign = await this.campaignRepository.create({
      id: campaignId,
      userId,
      name: campaignData.name,
      description: campaignData.description || '',
      adCopy: campaignData.adCopy,
      mediaId: campaignData.mediaId || null,
      startDate: campaignData.startDate || null,
      endDate: campaignData.endDate || null,
      budget: campaignData.budget || null,
      status: 'draft',
      abVariant: campaignData.abVariant || null,
      templateId: campaignData.templateId || null,
    });

    // Create campaign-platform associations
    for (const { platformType, platformId } of connectedPlatforms) {
      const campaignPlatformId = `cp_${uuidv4()}`;
      await this.campaignPlatformRepository.create({
        id: campaignPlatformId,
        campaignId,
        platformId,
        platformType,
        status: 'pending',
      });
    }

    return campaign;
  }

  async getCampaign(campaignId) {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const platforms = await this.campaignPlatformRepository.findByCampaignId(campaignId);

    return {
      ...campaign,
      platforms,
    };
  }

  async listCampaigns(userId, limit = 50, offset = 0) {
    return this.campaignRepository.findByUserId(userId, limit, offset);
  }

  async updateCampaign(campaignId, updates) {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (updates.name) {
      const validation = validateCampaignName(updates.name);
      if (!validation.isValid()) {
        throw new Error(`Invalid campaign name: ${validation.getErrors()[0].message}`);
      }
    }

    if (updates.adCopy) {
      const validation = validateAdCopy(updates.adCopy);
      if (!validation.isValid()) {
        throw new Error(`Invalid ad copy: ${validation.getErrors()[0].message}`);
      }
    }

    if (updates.budget) {
      const validation = validateBudget(updates.budget);
      if (!validation.isValid()) {
        throw new Error(`Invalid budget: ${validation.getErrors()[0].message}`);
      }
    }

    await this.campaignRepository.update(campaignId, updates);

    return this.campaignRepository.findById(campaignId);
  }

  async deleteCampaign(campaignId) {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await this.campaignPlatformRepository.deleteByCampaignId(campaignId);
    await this.campaignRepository.delete(campaignId);
  }

  async duplicateCampaign(campaignId, userId) {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const newCampaignId = `campaign_${uuidv4()}`;
    const platforms = await this.campaignPlatformRepository.findByCampaignId(campaignId);

    const newCampaign = await this.campaignRepository.create({
      id: newCampaignId,
      userId,
      name: `${campaign.name} (Copy)`,
      description: campaign.description,
      adCopy: campaign.adCopy,
      mediaId: campaign.mediaId,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      budget: campaign.budget,
      status: 'draft',
      abVariant: campaign.abVariant,
      templateId: campaign.templateId,
    });

    for (const platform of platforms) {
      const campaignPlatformId = `cp_${uuidv4()}`;
      await this.campaignPlatformRepository.create({
        id: campaignPlatformId,
        campaignId: newCampaignId,
        platformId: platform.platformId,
        platformType: platform.platformType,
        status: 'pending',
      });
    }

    return newCampaign;
  }
}

export default CampaignService;

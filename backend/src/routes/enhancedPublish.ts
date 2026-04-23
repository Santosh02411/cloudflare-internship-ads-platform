/**
 * Enhanced Publish Routes using New Architecture
 * Professional Cloudflare internship standards
 */

import { AICopywritingService } from '../services/AICopywritingService';
import { PublishQueue } from '../queue/PublishQueue';

export function setupEnhancedPublishRoutes(app: any, env: Env) {
  const aiService = new AICopywritingService(env);
  const publishQueue = new PublishQueue(env.PUBLISH_QUEUE);

  // AI Copywriting Endpoint
  app.post('/api/ai/generate-copy', async (c) => {
    try {
      const { campaignTitle, productDescription, targetAudience, budget, platform, tone, contentType } = await c.req.json();
      
      if (!campaignTitle) {
        return c.json({ error: 'Campaign title is required' }, 400);
      }

      const userId = c.req.user?.userId;
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const result = await aiService.generateCopy({
        campaignTitle,
        productDescription,
        targetAudience,
        budget,
        platform,
        tone: tone || 'professional',
        contentType: contentType || 'all',
      }, userId);

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[AI] Copy generation failed:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // AI Copy Variations Endpoint
  app.post('/api/ai/generate-variations', async (c) => {
    try {
      const { campaignTitle, productDescription, targetAudience, budget, platform, tone, variations } = await c.req.json();
      
      if (!campaignTitle) {
        return c.json({ error: 'Campaign title is required' }, 400);
      }

      const userId = c.req.user?.userId;
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const result = await aiService.generateVariations({
        campaignTitle,
        productDescription,
        targetAudience,
        budget,
        platform,
        tone: tone || 'professional',
        contentType: 'all',
        variations: variations || 3,
      }, userId);

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[AI] Variations generation failed:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // AI History Endpoint
  app.get('/api/ai/history', async (c) => {
    try {
      const userId = c.req.user?.userId;
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const { limit = 10 } = c.req.query();
      const history = await aiService.getUserHistory(userId, parseInt(limit));

      return c.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('[AI] History fetch failed:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // AI Usage Stats Endpoint
  app.get('/api/ai/usage', async (c) => {
    try {
      const userId = c.req.user?.userId;
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const { period = 'month' } = c.req.query();
      const usage = await aiService.getUserUsage(userId, period as 'day' | 'week' | 'month');

      return c.json({
        success: true,
        data: usage,
      });
    } catch (error) {
      console.error('[AI] Usage fetch failed:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Enhanced Publish Endpoint (Async)
  app.post('/api/publish/enhanced', async (c) => {
    try {
      const { campaignId, priority = 'medium' } = await c.req.json();
      
      if (!campaignId) {
        return c.json({ error: 'Campaign ID is required' }, 400);
      }

      const userId = c.req.user?.userId;
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      // Get campaign details
      const campaign = await env.DB.prepare(
        'SELECT * FROM campaigns WHERE id = ? AND user_id = ?'
      ).bind(campaignId, userId).first();

      if (!campaign) {
        return c.json({ error: 'Campaign not found' }, 404);
      }

      // Get campaign platforms
      const campaignPlatforms = await env.DB.prepare(
        'SELECT cp.*, p.platform_type FROM campaign_platforms cp JOIN platforms p ON cp.platform_id = p.id WHERE cp.campaign_id = ?'
      ).bind(campaignId).all();

      if (campaignPlatforms.length === 0) {
        return c.json({ error: 'No platforms associated with campaign' }, 400);
      }

      // Create jobs for each platform
      const jobIds = [];
      for (const platform of campaignPlatforms) {
        const job = {
          campaignId,
          platformId: platform.platform_id,
          platformType: platform.platform_type,
          payload: {
            adCopy: campaign.ad_copy,
            adName: campaign.name,
            campaignName: campaign.name,
            budget: campaign.budget,
            mediaUrl: campaign.media_id, // Would need to get actual URL
          },
          userId,
          priority,
        };

        const jobId = await publishQueue.addJob(job);
        jobIds.push(jobId);
      }

      // Initialize campaign orchestrator
      const orchestratorId = env.CAMPAIGN_ORCHESTRATOR.idFromName(campaignId);
      const orchestrator = env.CAMPAIGN_ORCHESTRATOR.get(orchestratorId);
      
      await orchestrator.initializeCampaign(campaignId, userId, campaignPlatforms.map(p => p.platform_type));

      // Start publishing process
      await orchestrator.startPublishing(campaignId, userId);

      return c.json({
        success: true,
        data: {
          campaignId,
          jobIds,
          message: 'Campaign publishing initiated',
          status: 'publishing',
        },
      });
    } catch (error) {
      console.error('[Publish] Enhanced publish failed:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Real-time Campaign Status Endpoint
  app.get('/api/campaigns/:id/status/realtime', async (c) => {
    try {
      const { id } = c.req.param();
      const userId = c.req.user?.userId;
      
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      const orchestratorId = env.CAMPAIGN_ORCHESTRATOR.idFromName(id);
      const orchestrator = env.CAMPAIGN_ORCHESTRATOR.get(orchestratorId);
      
      const campaignState = await orchestrator.getCampaignState(id);
      
      if (!campaignState || campaignState.userId !== userId) {
        return c.json({ error: 'Campaign not found' }, 404);
      }

      return c.json({
        success: true,
        data: campaignState,
      });
    } catch (error) {
      console.error('[Status] Real-time status failed:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Platform Status Update Endpoint (for queue worker callbacks)
  app.post('/api/platforms/:platformId/status', async (c) => {
    try {
      const { platformId } = c.req.param();
      const { campaignId, status, adId, errorMessage, metrics } = await c.req.json();
      
      if (!campaignId || !status) {
        return c.json({ error: 'Campaign ID and status are required' }, 400);
      }

      const orchestratorId = env.CAMPAIGN_ORCHESTRATOR.idFromName(campaignId);
      const orchestrator = env.CAMPAIGN_ORCHESTRATOR.get(orchestratorId);
      
      await orchestrator.updatePlatformStatus(
        campaignId,
        platformId,
        status,
        adId,
        errorMessage,
        metrics
      );

      return c.json({
        success: true,
        message: 'Platform status updated',
      });
    } catch (error) {
      console.error('[Status] Platform update failed:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Queue Statistics Endpoint
  app.get('/api/queue/stats', async (c) => {
    try {
      const stats = publishQueue.getStats();
      
      return c.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('[Queue] Stats fetch failed:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  console.log('[Routes] Enhanced publish routes configured');
}

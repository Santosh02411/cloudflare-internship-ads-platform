/**
 * Main Backend Entry Point - Cloudflare Workers with Hono
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Import utility factories
import { createDatabaseService } from './utils/db.js';
import { createKVService } from './utils/kv.js';

// Import repositories
import UserRepository from './repositories/UserRepository.js';
import CampaignRepository from './repositories/CampaignRepository.js';
import MediaRepository from './repositories/MediaRepository.js';
import PlatformRepository from './repositories/PlatformRepository.js';
import CampaignPlatformRepository from './repositories/CampaignPlatformRepository.js';
import JobRepository from './repositories/JobRepository.js';

// Import services
import AuthService from './services/AuthService.js';
import CampaignService from './services/CampaignService.js';
import MediaService from './services/MediaService.js';
import PlatformService from './services/PlatformService.js';
import PublishService from './services/PublishService.js';
import AIService from './services/AIService.js';
import QueueWorker from './queue/workers.js';

// Import middleware
import { requireAuth } from './middleware/auth.js';
import { createErrorResponse, createSuccessResponse } from './middleware/errorHandler.js';

// Health check endpoint
app.get('/health', (c) => {
  return createSuccessResponse({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize services on each request
function initializeServices(env) {
  const db = createDatabaseService(env.DB);
  const kv = createKVService(env.CACHE);

  return {
    userRepo: new UserRepository(db),
    campaignRepo: new CampaignRepository(db),
    mediaRepo: new MediaRepository(db),
    platformRepo: new PlatformRepository(db),
    campaignPlatformRepo: new CampaignPlatformRepository(db),
    jobRepo: new JobRepository(db),
    authService: new AuthService(new UserRepository(db), kv, env.JWT_SECRET || 'dev-secret'),
    campaignService: new CampaignService(
      new CampaignRepository(db),
      new CampaignPlatformRepository(db),
      new PlatformRepository(db)
    ),
    mediaService: new MediaService(new MediaRepository(db), env.MEDIA_BUCKET),
    platformService: new PlatformService(new PlatformRepository(db)),
    publishService: new PublishService(
      new CampaignRepository(db),
      new CampaignPlatformRepository(db),
      new PlatformRepository(db),
      new JobRepository(db),
      env.PUBLISH_QUEUE,
      kv
    ),
    aiService: new AIService(env.OPENAI_API_KEY),
  };
}

function initializeQueueWorker(env) {
  const db = createDatabaseService(env.DB);

  return new QueueWorker(
    new JobRepository(db),
    new CampaignPlatformRepository(db),
    new PlatformRepository(db),
    new CampaignRepository(db)
  );
}

// Auth Routes
app.post('/api/auth/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return createErrorResponse('Missing required fields: email, password, name', 400);
    }

    const services = initializeServices(c.env);
    const result = await services.authService.signup(email, password, name);

    return createSuccessResponse(result, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return createErrorResponse(error.message, 400);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return createErrorResponse('Missing required fields: email, password', 400);
    }

    const services = initializeServices(c.env);
    const result = await services.authService.login(email, password);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error.message, 401);
  }
});

// Campaign Routes
app.get(
  '/api/campaigns',
  requireAuth(async (c) => {
    try {
      const services = initializeServices(c.env);
      const limit = parseInt(c.req.query('limit')) || 50;
      const offset = parseInt(c.req.query('offset')) || 0;

      const campaigns = await services.campaignService.listCampaigns(c.req.user.userId, limit, offset);

      return createSuccessResponse({ campaigns, limit, offset });
    } catch (error) {
      return createErrorResponse(error.message, 500);
    }
  })
);

app.post(
  '/api/campaigns',
  requireAuth(async (c) => {
    try {
      const data = await c.req.json();
      const services = initializeServices(c.env);

      const campaign = await services.campaignService.createCampaign(c.req.user.userId, data);

      return createSuccessResponse(campaign, 201);
    } catch (error) {
      console.error('Campaign creation error:', error);
      return createErrorResponse(error.message, 400);
    }
  })
);

app.get(
  '/api/campaigns/:id',
  requireAuth(async (c) => {
    try {
      const { id } = c.req.param();
      const services = initializeServices(c.env);

      const campaign = await services.campaignService.getCampaign(id);

      return createSuccessResponse(campaign);
    } catch (error) {
      return createErrorResponse(error.message, 404);
    }
  })
);

app.put(
  '/api/campaigns/:id',
  requireAuth(async (c) => {
    try {
      const { id } = c.req.param();
      const updates = await c.req.json();
      const services = initializeServices(c.env);

      const campaign = await services.campaignService.updateCampaign(id, updates);

      return createSuccessResponse(campaign);
    } catch (error) {
      return createErrorResponse(error.message, 400);
    }
  })
);

app.delete(
  '/api/campaigns/:id',
  requireAuth(async (c) => {
    try {
      const { id } = c.req.param();
      const services = initializeServices(c.env);

      await services.campaignService.deleteCampaign(id);

      return createSuccessResponse({ message: 'Campaign deleted successfully' });
    } catch (error) {
      return createErrorResponse(error.message, 400);
    }
  })
);

app.post(
  '/api/campaigns/:id/duplicate',
  requireAuth(async (c) => {
    try {
      const { id } = c.req.param();
      const services = initializeServices(c.env);

      const campaign = await services.campaignService.duplicateCampaign(id, c.req.user.userId);

      return createSuccessResponse(campaign, 201);
    } catch (error) {
      return createErrorResponse(error.message, 400);
    }
  })
);

// Media Routes
app.post(
  '/api/media/upload',
  requireAuth(async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get('file');

      if (!file) {
        return createErrorResponse('File is required', 400);
      }

      const services = initializeServices(c.env);
      const media = await services.mediaService.uploadMedia(c.req.user.userId, file);

      return createSuccessResponse(media, 201);
    } catch (error) {
      return createErrorResponse(error.message, 400);
    }
  })
);

app.get(
  '/api/media',
  requireAuth(async (c) => {
    try {
      const limit = parseInt(c.req.query('limit')) || 50;
      const offset = parseInt(c.req.query('offset')) || 0;

      const services = initializeServices(c.env);
      const media = await services.mediaService.listMedia(c.req.user.userId, limit, offset);

      return createSuccessResponse({ media, limit, offset });
    } catch (error) {
      return createErrorResponse(error.message, 500);
    }
  })
);

app.delete(
  '/api/media/:id',
  requireAuth(async (c) => {
    try {
      const { id } = c.req.param();
      const services = initializeServices(c.env);

      await services.mediaService.deleteMedia(id);

      return createSuccessResponse({ message: 'Media deleted successfully' });
    } catch (error) {
      return createErrorResponse(error.message, 400);
    }
  })
);

// Platform Routes
app.get('/api/platforms/oauth/meta', async (c) => {
  try {
    const { redirect_uri } = c.req.query();
    
    if (!redirect_uri) {
      return createErrorResponse('Redirect URI is required', 400);
    }

    if (!c.env.META_APP_ID) {
      return createErrorResponse('Meta app ID not configured', 500);
    }

    const scopes = ['ads_management', 'ads_read', 'business_management'];
    const params = new URLSearchParams({
      client_id: c.env.META_APP_ID,
      redirect_uri: redirect_uri,
      scope: scopes.join(','),
      response_type: 'code',
    });

    const oauthUrl = `https://graph.facebook.com/v19.0/dialog/oauth?${params}`;
    
    return createSuccessResponse({ oauthUrl });
  } catch (error) {
    return createErrorResponse(error.message, 500);
  }
});

app.post(
  '/api/platforms/connect',
  requireAuth(async (c) => {
    try {
      const { platformType, authCode, redirectUri } = await c.req.json();

      if (!platformType || !authCode) {
        return createErrorResponse('Missing required fields', 400);
      }

      const services = initializeServices(c.env);
      const platform = await services.platformService.connectPlatform(
        c.req.user.userId,
        platformType,
        authCode,
        redirectUri,
        c.env
      );

      return createSuccessResponse(platform, 201);
    } catch (error) {
      return createErrorResponse(error.message, 400);
    }
  })
);

app.get(
  '/api/platforms',
  requireAuth(async (c) => {
    try {
      const services = initializeServices(c.env);
      const platforms = await services.platformService.listUserPlatforms(c.req.user.userId);

      return createSuccessResponse({ platforms });
    } catch (error) {
      return createErrorResponse(error.message, 500);
    }
  })
);

app.delete(
  '/api/platforms/:platformType',
  requireAuth(async (c) => {
    try {
      const { platformType } = c.req.param();
      const services = initializeServices(c.env);

      await services.platformService.disconnectPlatform(c.req.user.userId, platformType);

      return createSuccessResponse({ message: 'Platform disconnected successfully' });
    } catch (error) {
      return createErrorResponse(error.message, 400);
    }
  })
);

// Publish Routes
app.post(
  '/api/publish',
  requireAuth(async (c) => {
    try {
      const { campaignId } = await c.req.json();

      if (!campaignId) {
        return createErrorResponse('Campaign ID is required', 400);
      }

      const services = initializeServices(c.env);
      const jobs = await services.publishService.publishCampaign(campaignId);

      return createSuccessResponse({ message: 'Campaign published', jobs }, 202);
    } catch (error) {
      return createErrorResponse(error.message, 400);
    }
  })
);

// Status Routes
app.get(
  '/api/status/:campaignId',
  requireAuth(async (c) => {
    try {
      const { campaignId } = c.req.param();
      const services = initializeServices(c.env);

      const status = await services.publishService.getPublishingStatus(campaignId);

      return createSuccessResponse(status);
    } catch (error) {
      return createErrorResponse(error.message, 404);
    }
  })
);

// AI Routes
app.post(
  '/api/ai/generate-copy',
  requireAuth(async (c) => {
    try {
      const { productName, targetAudience, tone } = await c.req.json();

      if (!productName || !targetAudience) {
        return createErrorResponse('Product name and target audience are required', 400);
      }

      const services = initializeServices(c.env);
      const result = await services.aiService.generateAdCopy(productName, targetAudience, tone);

      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error.message, 400);
    }
  })
);

app.post(
  '/api/ai/analyze-copy',
  requireAuth(async (c) => {
    try {
      const { adCopy, platformType } = await c.req.json();

      if (!adCopy) {
        return createErrorResponse('Ad copy is required', 400);
      }

      const services = initializeServices(c.env);
      const analysis = await services.aiService.analyzeAdPerformance(adCopy, platformType);

      return createSuccessResponse(analysis);
    } catch (error) {
      return createErrorResponse(error.message, 400);
    }
  })
);

// 404 handler
app.all('*', (c) => {
  return createErrorResponse('Not found', 404);
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch.bind(app),
  async queue(batch, env, ctx) {
    const worker = initializeQueueWorker(env);

    for (const message of batch.messages) {
      try {
        await worker.processJob(message.body);
      } catch (error) {
        console.error('Queue message processing failed:', error);
      }
    }
  },
};

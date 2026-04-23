/**
 * Shared constants across frontend and backend
 */

// Campaign statuses
const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
};

// Platform types
const PLATFORM_TYPE = {
  META: 'meta',
  GOOGLE_ADS: 'google_ads',
  TIKTOK: 'tiktok',
  LINKEDIN: 'linkedin',
};

const PLATFORM_NAMES = {
  meta: 'Meta (Facebook/Instagram)',
  google_ads: 'Google Ads',
  tiktok: 'TikTok Ads',
  linkedin: 'LinkedIn Ads',
};

// Job statuses
const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
};

// Platform status
const PLATFORM_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  RETRYING: 'retrying',
};

// A/B Testing variants
const AB_VARIANT = {
  CONTROL: 'control',
  VARIANT_A: 'variant_a',
  VARIANT_B: 'variant_b',
};

// Media types
const MEDIA_TYPE = {
  IMAGE: 'image',
  VIDEO: 'video',
};

// API endpoints
const API_ENDPOINTS = {
  AUTH_LOGIN: '/api/auth/login',
  AUTH_SIGNUP: '/api/auth/signup',
  CAMPAIGNS_LIST: '/api/campaigns',
  CAMPAIGNS_CREATE: '/api/campaigns',
  CAMPAIGNS_UPDATE: (id) => `/api/campaigns/${id}`,
  CAMPAIGNS_DELETE: (id) => `/api/campaigns/${id}`,
  PUBLISH: '/api/publish',
  STATUS: (id) => `/api/status/${id}`,
  PLATFORMS_LIST: '/api/platforms',
  PLATFORMS_CONNECT: '/api/platforms',
  MEDIA_UPLOAD: '/api/media/upload',
  MEDIA_LIST: '/api/media',
};

// Error messages
const ERROR_MESSAGES = {
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
  CAMPAIGN_NAME_REQUIRED: 'Campaign name is required',
  AD_COPY_REQUIRED: 'Ad copy is required',
  PLATFORM_REQUIRED: 'At least one platform must be selected',
  INVALID_BUDGET: 'Budget must be between 1 and 1,000,000',
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error',
};

// Success messages
const SUCCESS_MESSAGES = {
  CAMPAIGN_CREATED: 'Campaign created successfully',
  CAMPAIGN_UPDATED: 'Campaign updated successfully',
  CAMPAIGN_PUBLISHED: 'Campaign published successfully',
  PLATFORM_CONNECTED: 'Platform connected successfully',
  MEDIA_UPLOADED: 'Media uploaded successfully',
};

module.exports = {
  CAMPAIGN_STATUS,
  PLATFORM_TYPE,
  PLATFORM_NAMES,
  JOB_STATUS,
  PLATFORM_STATUS,
  AB_VARIANT,
  MEDIA_TYPE,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};

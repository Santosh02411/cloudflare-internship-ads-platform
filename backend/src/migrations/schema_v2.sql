-- Enhanced D1 Schema for Professional Cloudflare Internship Standards
-- Adds audit_logs table and improves campaign_platforms tracking

-- Existing tables remain unchanged, adding new audit functionality

-- Audit Logs Table - Tracks all platform interactions
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'authenticate', 'publish', 'status_check', 'delete'
  status TEXT NOT NULL, -- 'success', 'failed', 'retry'
  details TEXT, -- JSON blob with detailed response/error info
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (platform_id) REFERENCES platforms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Enhanced Campaign Platforms Table - Better tracking of API responses
CREATE TABLE IF NOT EXISTS campaign_platforms_enhanced (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  platform_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  ad_id TEXT,
  api_response TEXT, -- Full API response as JSON
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at DATETIME,
  published_at DATETIME,
  metrics TEXT, -- JSON blob with impressions, clicks, spend, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (platform_id) REFERENCES platforms(id),
  UNIQUE(campaign_id, platform_id)
);

-- Platform Rate Limiting Table - Track API usage per platform
CREATE TABLE IF NOT EXISTS platform_rate_limits (
  id TEXT PRIMARY KEY,
  platform_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  requests_count INTEGER DEFAULT 0,
  limit_count INTEGER DEFAULT 0,
  reset_time DATETIME,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(platform_type, user_id)
);

-- AI Generated Content Table - Track AI copywriting usage
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  campaign_id TEXT,
  content_type TEXT NOT NULL, -- 'headline', 'description', 'cta'
  input_data TEXT, -- JSON blob with original input
  generated_content TEXT,
  model_used TEXT DEFAULT 'llama-3',
  tokens_used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Enhanced Publishing Jobs Table - Better queue tracking
CREATE TABLE IF NOT EXISTS publishing_jobs_enhanced (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  campaign_platform_id TEXT NOT NULL,
  platform_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
  payload TEXT NOT NULL, -- JSON blob with full job data
  result TEXT, -- JSON blob with result data
  error_message TEXT,
  error_details TEXT, -- JSON blob with detailed error info
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at DATETIME,
  scheduled_at DATETIME,
  started_at DATETIME,
  completed_at DATETIME,
  processing_time_ms INTEGER, -- Time taken to process
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (campaign_platform_id) REFERENCES campaign_platforms_enhanced(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_campaign_id ON audit_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_platform_id ON audit_logs(platform_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_campaign_platforms_enhanced_campaign_id ON campaign_platforms_enhanced(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_platforms_enhanced_platform_id ON campaign_platforms_enhanced(platform_id);
CREATE INDEX IF NOT EXISTS idx_campaign_platforms_enhanced_status ON campaign_platforms_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_campaign_platforms_enhanced_updated_at ON campaign_platforms_enhanced(updated_at);

CREATE INDEX IF NOT EXISTS idx_platform_rate_limits_user_platform ON platform_rate_limits(user_id, platform_type);
CREATE INDEX IF NOT EXISTS idx_platform_rate_limits_reset_time ON platform_rate_limits(reset_time);

CREATE INDEX IF NOT EXISTS idx_ai_generated_content_user_id ON ai_generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_campaign_id ON ai_generated_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_created_at ON ai_generated_content(created_at);

CREATE INDEX IF NOT EXISTS idx_publishing_jobs_enhanced_status ON publishing_jobs_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_enhanced_priority ON publishing_jobs_enhanced(priority);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_enhanced_next_retry_at ON publishing_jobs_enhanced(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_enhanced_created_at ON publishing_jobs_enhanced(created_at);

-- Migration: Copy existing data to enhanced tables
INSERT OR IGNORE INTO campaign_platforms_enhanced (
  id, campaign_id, platform_id, platform_type, status, 
  ad_id, error_message, retry_count, created_at, updated_at
)
SELECT 
  id, campaign_id, platform_id, platform_type, status,
  ad_id, error_message, retry_count, created_at, updated_at
FROM campaign_platforms;

-- View: Campaign Status Summary
CREATE VIEW IF NOT EXISTS campaign_status_summary AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.user_id,
  c.status as campaign_status,
  COUNT(cp.id) as total_platforms,
  COUNT(CASE WHEN cp.status = 'completed' THEN 1 END) as completed_platforms,
  COUNT(CASE WHEN cp.status = 'failed' THEN 1 END) as failed_platforms,
  COUNT(CASE WHEN cp.status = 'pending' THEN 1 END) as pending_platforms,
  MAX(cp.updated_at) as last_platform_update,
  c.created_at as campaign_created_at
FROM campaigns c
LEFT JOIN campaign_platforms_enhanced cp ON c.id = cp.campaign_id
GROUP BY c.id, c.name, c.user_id, c.status, c.created_at;

-- View: Platform Performance Metrics
CREATE VIEW IF NOT EXISTS platform_performance_metrics AS
SELECT 
  p.platform_type,
  COUNT(al.id) as total_actions,
  COUNT(CASE WHEN al.status = 'success' THEN 1 END) as successful_actions,
  COUNT(CASE WHEN al.status = 'failed' THEN 1 END) as failed_actions,
  AVG(CASE WHEN al.action = 'publish' THEN pj.processing_time_ms END) as avg_processing_time_ms,
  MAX(prl.requests_count) as max_requests_per_period,
  AVG(prl.requests_count) as avg_requests_per_period
FROM platforms p
LEFT JOIN audit_logs al ON p.id = al.platform_id
LEFT JOIN publishing_jobs_enhanced pj ON al.details LIKE '%' || pj.id || '%'
LEFT JOIN platform_rate_limits prl ON p.platform_type = prl.platform_type
GROUP BY p.platform_type;

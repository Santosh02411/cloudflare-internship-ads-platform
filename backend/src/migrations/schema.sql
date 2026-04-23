-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Platforms table
CREATE TABLE IF NOT EXISTS platforms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform_type TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, platform_type)
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  r2_key TEXT NOT NULL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ad_copy TEXT NOT NULL,
  media_id TEXT,
  start_date DATETIME,
  end_date DATETIME,
  budget REAL,
  status TEXT DEFAULT 'draft',
  a_b_variant TEXT,
  template_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (media_id) REFERENCES media(id)
);

-- Campaign Platforms table (many-to-many)
CREATE TABLE IF NOT EXISTS campaign_platforms (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  platform_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  ad_id TEXT,
  api_response TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (platform_id) REFERENCES platforms(id),
  UNIQUE(campaign_id, platform_id)
);

-- Publishing Jobs table
CREATE TABLE IF NOT EXISTS publishing_jobs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  campaign_platform_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payload TEXT NOT NULL,
  result TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (campaign_platform_id) REFERENCES campaign_platforms(id)
);

-- Campaign Duplicates/Templates table
CREATE TABLE IF NOT EXISTS campaign_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ad_copy TEXT,
  media_id TEXT,
  platforms TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (media_id) REFERENCES media(id)
);

-- Analytics table (for A/B testing and tracking)
CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  platform_type TEXT,
  metric_type TEXT,
  value REAL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_platforms_user_id ON platforms(user_id);
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_platforms_campaign_id ON campaign_platforms(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_platforms_status ON campaign_platforms(status);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_status ON publishing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_campaign_id ON publishing_jobs(campaign_id);

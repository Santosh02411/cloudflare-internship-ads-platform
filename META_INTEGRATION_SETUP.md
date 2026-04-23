# Meta (Facebook/Instagram) Integration Setup Guide

## Overview
This guide will help you set up real Meta (Facebook/Instagram) integration to publish actual ads instead of mock data.

## Prerequisites
- Meta for Developers account
- Business Facebook Page
- Business Instagram account
- Ad Account (Business Manager)

## Step 1: Create Meta Developer App

### 1.1 Go to Meta for Developers
1. Visit [developers.facebook.com](https://developers.facebook.com)
2. Log in with your Facebook account
3. Click "Create App" → "Business"

### 1.2 App Configuration
- **App Name**: Your SaaS Platform Name
- **App Contact Email**: Your business email
- **Business Portfolio**: Select or create one
- **App Purpose**: "Advertising and marketing"

### 1.3 Add Products
Add these products to your app:
1. **Facebook Login** (for OAuth)
2. **Marketing API** (for ads management)

## Step 2: Configure OAuth Settings

### 2.1 Facebook Login Settings
1. Go to "Products" → "Facebook Login" → "Settings"
2. Add your redirect URIs:
   - Development: `http://localhost:3000/auth/meta/callback`
   - Production: `https://yourdomain.com/auth/meta/callback`

### 2.2 App Domains
Add your domains:
- Development: `localhost`
- Production: `yourdomain.com`

## Step 3: Get App Credentials

### 3.1 App ID and Secret
1. Go to "Settings" → "Basic"
2. Copy **App ID** and **App Secret**

### 3.2 Environment Variables
Add these to your Cloudflare Workers environment:

```bash
# Using Wrangler CLI
wrangler secret put META_APP_ID
wrangler secret put META_APP_SECRET
wrangler secret put META_REDIRECT_URI
```

## Step 4: Configure Business Assets

### 4.1 Business Verification
1. Go to Business Settings
2. Complete business verification
3. Add your Ad Account

### 4.2 Page and Instagram Account
1. Link your Facebook Page to the app
2. Connect your Instagram account
3. Grant advertising permissions

## Step 5: API Permissions

### 5.1 Required Permissions
Your app needs these permissions:
- `ads_management` - Create and manage ads
- `ads_read` - Read ad insights
- `business_management` - Manage business assets

### 5.2 App Review
For production use:
1. Submit app for review
2. Provide screenshots of your integration
3. Explain how you'll use each permission

## Step 6: Update Code Configuration

### 6.1 Backend Configuration
Update your `wrangler.toml`:

```toml
[env.production.vars]
META_APP_ID = "your_app_id"
META_REDIRECT_URI = "https://yourdomain.com/auth/meta/callback"

[env.development.vars]
META_APP_ID = "your_dev_app_id"
META_REDIRECT_URI = "http://localhost:3000/auth/meta/callback"
```

### 6.2 Frontend Integration
Update your platform connection flow:

```javascript
// Get OAuth URL
const response = await fetch('/api/platforms/oauth/meta?redirect_uri=' + encodeURIComponent(redirectUri));
const { oauthUrl } = await response.json();

// Redirect to Meta for authorization
window.location.href = oauthUrl;
```

## Step 7: Test Integration

### 7.1 Development Testing
1. Start your backend: `npm run dev`
2. Start your frontend: `npm run dev`
3. Go to platform connection page
4. Click "Connect Meta"
5. Complete OAuth flow
6. Create a test campaign

### 7.2 Verify Real Integration
Check that:
- Ads appear in your Meta Ads Manager
- Campaign IDs are real (not mock IDs)
- Status updates reflect actual ad states

## Step 8: Production Deployment

### 8.1 Environment Setup
```bash
# Set production secrets
wrangler secret put META_APP_ID --env production
wrangler secret put META_APP_SECRET --env production
```

### 8.2 App Review Checklist
- [ ] App is complete and functional
- [ ] All required permissions are justified
- [ ] Privacy policy is provided
- [ ] Terms of service are provided
- [ ] Business verification is complete

## Troubleshooting

### Common Issues

#### 1. "Invalid OAuth redirect URI"
- Ensure redirect URI matches exactly in Meta settings
- Check for trailing slashes
- Verify HTTPS for production

#### 2. "Insufficient permissions"
- Verify Ad Account access
- Check Business Manager settings
- Ensure page is connected to app

#### 3. "Ad creation failed"
- Verify Ad Account has sufficient funds
- Check targeting parameters
- Ensure creative meets Meta requirements

#### 4. "API rate limit exceeded"
- Implement proper rate limiting
- Use batch operations where possible
- Cache non-critical data

### Debug Mode
Enable debug logging:
```javascript
// In RealMetaAdapter
console.log('[Meta Debug] API Request:', url, body);
console.log('[Meta Debug] API Response:', response);
```

## Security Best Practices

### 1. Token Storage
- Store tokens in encrypted KV storage
- Implement token refresh mechanism
- Log token expiration events

### 2. API Rate Limiting
- Implement per-user rate limits
- Use exponential backoff for retries
- Monitor API usage metrics

### 3. Data Privacy
- Comply with GDPR/CCPA
- Implement data retention policies
- Provide user data export

## Next Steps

After Meta integration is working:
1. Implement Google Ads real integration
2. Add LinkedIn real integration
3. Implement TikTok real integration
4. Add webhook support for real-time updates
5. Implement advanced analytics

## Support Resources

- [Meta Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Marketing API Reference](https://developers.facebook.com/docs/marketing-api/reference)
- [OAuth 2.0 Guide](https://developers.facebook.com/docs/facebook-login/oauth)
- [App Review Guidelines](https://developers.facebook.com/docs/app-review/guidelines)

---

**Note**: This integration replaces the mock Meta adapter with real Graph API calls. Test thoroughly in development before deploying to production.

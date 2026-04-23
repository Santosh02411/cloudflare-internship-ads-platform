# Unified Social Media Ads SaaS - JavaScript Project Structure

```
.
├── frontend/
│   ├── app/
│   │   ├── layout.jsx
│   │   ├── page.jsx
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.jsx
│   │   │   └── layout.jsx
│   │   ├── dashboard/
│   │   │   ├── page.jsx
│   │   │   ├── layout.jsx
│   │   │   └── campaign/
│   │   │       ├── [id]/
│   │   │       │   └── page.jsx
│   │   │       └── create/
│   │   │           └── page.jsx
│   │   ├── media/
│   │   │   ├── page.jsx
│   │   │   └── layout.jsx
│   │   ├── platforms/
│   │   │   ├── page.jsx
│   │   │   └── layout.jsx
│   │   └── api/
│   │       └── [...routes].js
│   ├── components/
│   │   ├── CampaignForm.jsx
│   │   ├── MediaUploader.jsx
│   │   ├── PlatformSelector.jsx
│   │   ├── CampaignCard.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── Navbar.jsx
│   │   ├── Layout.jsx
│   │   └── shared/
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── Modal.jsx
│   │       └── Toast.jsx
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── storage.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useCampaigns.js
│   │   └── usePolling.js
│   ├── utils/
│   │   ├── constants.js
│   │   └── validators.js
│   ├── styles/
│   │   └── globals.css
│   ├── package.json
│   ├── next.config.js
│   └── tailwind.config.js
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── campaigns.js
│   │   │   ├── media.js
│   │   │   ├── platforms.js
│   │   │   ├── publish.js
│   │   │   └── status.js
│   │   ├── controllers/
│   │   │   ├── AuthController.js
│   │   │   ├── CampaignController.js
│   │   │   ├── MediaController.js
│   │   │   ├── PlatformController.js
│   │   │   ├── PublishController.js
│   │   │   └── StatusController.js
│   │   ├── services/
│   │   │   ├── AuthService.js
│   │   │   ├── CampaignService.js
│   │   │   ├── MediaService.js
│   │   │   ├── PlatformService.js
│   │   │   ├── PublishService.js
│   │   │   ├── PlatformIntegrationService.js
│   │   │   └── AIService.js
│   │   ├── repositories/
│   │   │   ├── UserRepository.js
│   │   │   ├── CampaignRepository.js
│   │   │   ├── MediaRepository.js
│   │   │   ├── PlatformRepository.js
│   │   │   ├── CampaignPlatformRepository.js
│   │   │   └── JobRepository.js
│   │   ├── adapters/
│   │   │   ├── BasePlatformAdapter.js
│   │   │   ├── MetaAdapter.js
│   │   │   ├── GoogleAdsAdapter.js
│   │   │   ├── TikTokAdapter.js
│   │   │   ├── LinkedInAdapter.js
│   │   │   └── PlatformFactory.js
│   │   ├── queue/
│   │   │   ├── publisher.js
│   │   │   └── workers.js
│   │   ├── durable-objects/
│   │   │   ├── CampaignOrchestrator.js
│   │   │   └── RateLimiter.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── utils/
│   │   │   ├── db.js
│   │   │   ├── kv.js
│   │   │   ├── jwt.js
│   │   │   └── validators.js
│   │   ├── migrations/
│   │   │   └── schema.sql
│   │   └── config/
│   │       └── platforms.js
│   ├── wrangler.toml
│   ├── package.json
│   └── vitest.config.js
├── shared/
│   ├── constants.js
│   ├── validators.js
│   └── types.js
├── .gitignore
├── docker-compose.yml
├── README.md
└── DEPLOYMENT.md
```

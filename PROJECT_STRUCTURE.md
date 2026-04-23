# Unified Social Media Ads SaaS - Project Structure

```
.
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── campaign/
│   │   │       ├── [id]/
│   │   │       │   └── page.tsx
│   │   │       └── create/
│   │   │           └── page.tsx
│   │   ├── media/
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   ├── platforms/
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   └── api/
│   │       └── [...routes].ts
│   ├── components/
│   │   ├── CampaignForm.tsx
│   │   ├── MediaUploader.tsx
│   │   ├── PlatformSelector.tsx
│   │   ├── CampaignCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── Navbar.tsx
│   │   ├── Layout.tsx
│   │   └── shared/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Modal.tsx
│   │       └── Toast.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── storage.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCampaigns.ts
│   │   └── usePolling.ts
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   └── globals.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── tailwind.config.js
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── campaigns.ts
│   │   │   ├── media.ts
│   │   │   ├── platforms.ts
│   │   │   ├── publish.ts
│   │   │   └── status.ts
│   │   ├── controllers/
│   │   │   ├── AuthController.ts
│   │   │   ├── CampaignController.ts
│   │   │   ├── MediaController.ts
│   │   │   ├── PlatformController.ts
│   │   │   ├── PublishController.ts
│   │   │   └── StatusController.ts
│   │   ├── services/
│   │   │   ├── AuthService.ts
│   │   │   ├── CampaignService.ts
│   │   │   ├── MediaService.ts
│   │   │   ├── PlatformService.ts
│   │   │   ├── PublishService.ts
│   │   │   ├── PlatformIntegrationService.ts
│   │   │   └── AIService.ts
│   │   ├── repositories/
│   │   │   ├── UserRepository.ts
│   │   │   ├── CampaignRepository.ts
│   │   │   ├── MediaRepository.ts
│   │   │   ├── PlatformRepository.ts
│   │   │   ├── CampaignPlatformRepository.ts
│   │   │   └── JobRepository.ts
│   │   ├── adapters/
│   │   │   ├── BasePlatformAdapter.ts
│   │   │   ├── MetaAdapter.ts
│   │   │   ├── GoogleAdsAdapter.ts
│   │   │   ├── TikTokAdapter.ts
│   │   │   ├── LinkedInAdapter.ts
│   │   │   └── PlatformFactory.ts
│   │   ├── queue/
│   │   │   ├── publisher.ts
│   │   │   └── workers.ts
│   │   ├── durable-objects/
│   │   │   ├── CampaignOrchestrator.ts
│   │   │   └── RateLimiter.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── utils/
│   │   │   ├── db.ts
│   │   │   ├── kv.ts
│   │   │   ├── jwt.ts
│   │   │   └── validators.ts
│   │   ├── migrations/
│   │   │   └── schema.sql
│   │   └── config/
│   │       └── platforms.ts
│   ├── wrangler.toml
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── shared/
│   ├── types/
│   │   ├── index.ts
│   │   ├── campaign.ts
│   │   ├── platform.ts
│   │   ├── user.ts
│   │   ├── media.ts
│   │   └── job.ts
│   ├── utils/
│   │   ├── validators.ts
│   │   └── constants.ts
│   └── package.json
├── .gitignore
├── docker-compose.yml
├── README.md
└── DEPLOYMENT.md
```

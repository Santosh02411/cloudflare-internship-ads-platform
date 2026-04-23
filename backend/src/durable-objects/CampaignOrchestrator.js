/**
 * Campaign Orchestrator Durable Object
 * Handles stateful campaign orchestration and rate limiting
 */

import { DurableObject } from 'cloudflare:workers';

export class CampaignOrchestrator extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.campaignState = {};
    this.rateLimits = {};
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (path === '/orchestrate' && method === 'POST') {
        return this.handleOrchestrate(request);
      } else if (path === '/status' && method === 'GET') {
        return this.handleGetStatus();
      } else if (path === '/rate-limit' && method === 'POST') {
        return this.handleRateLimit(request);
      } else {
        return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  async handleOrchestrate(request) {
    const data = await request.json();
    const { campaignId, jobs } = data;

    if (!campaignId || !jobs || !Array.isArray(jobs)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Track campaign state
    this.campaignState[campaignId] = {
      totalJobs: jobs.length,
      completedJobs: 0,
      failedJobs: 0,
      successJobs: 0,
      startTime: Date.now(),
      jobs: jobs.map((j) => ({ jobId: j.id, status: 'pending' })),
    };

    return new Response(
      JSON.stringify({
        success: true,
        campaignId,
        message: `Orchestration started for campaign with ${jobs.length} jobs`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  async handleGetStatus() {
    return new Response(
      JSON.stringify({
        campaigns: this.campaignState,
        rateLimits: this.rateLimits,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  async handleRateLimit(request) {
    const data = await request.json();
    const { platformType } = data;

    if (!platformType) {
      return new Response(
        JSON.stringify({ error: 'Platform type required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const now = Date.now();

    if (!this.rateLimits[platformType]) {
      this.rateLimits[platformType] = {
        requests: 0,
        windowStart: now,
      };
    }

    const limit = this.rateLimits[platformType];
    const windowSize = 60000; // 1 minute

    if (now - limit.windowStart > windowSize) {
      limit.requests = 0;
      limit.windowStart = now;
    }

    const maxRequestsPerMinute = 100;
    const allowance = maxRequestsPerMinute - limit.requests;

    if (allowance <= 0) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((limit.windowStart + windowSize - now) / 1000),
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    limit.requests++;

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: allowance - 1,
        message: 'Request allowed',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  async handleAlarm() {
    console.log('Alarm triggered for campaign orchestrator');

    for (const campaignId in this.campaignState) {
      const campaign = this.campaignState[campaignId];

      if (campaign.completedJobs === campaign.totalJobs) {
        delete this.campaignState[campaignId];
      }
    }
  }
}

export { CampaignOrchestrator };

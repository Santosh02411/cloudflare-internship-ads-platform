/**
 * Rate Limiter Durable Object
 * Handles rate limiting per platform
 */

import { DurableObject } from 'cloudflare:workers';

export class RateLimiter extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.limits = {};
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (path === '/check' && method === 'POST') {
        return this.handleCheck(request);
      } else if (path === '/reset' && method === 'POST') {
        return this.handleReset(request);
      } else if (path === '/status' && method === 'GET') {
        return this.handleStatus();
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

  async handleCheck(request) {
    const data = await request.json();
    const { platformType, userId } = data;

    if (!platformType || !userId) {
      return new Response(
        JSON.stringify({ error: 'Platform type and user ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const key = `${platformType}:${userId}`;
    const now = Date.now();

    if (!this.limits[key]) {
      this.limits[key] = {
        requests: [],
        blocked: false,
        blockUntil: 0,
      };
    }

    const limit = this.limits[key];
    const windowSize = 3600000; // 1 hour

    // Remove old requests outside the window
    limit.requests = limit.requests.filter((timestamp) => now - timestamp < windowSize);

    // Check if user is blocked
    if (limit.blocked && now < limit.blockUntil) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: 'User blocked due to rate limit',
          retryAfter: Math.ceil((limit.blockUntil - now) / 1000),
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Reset block if time has passed
    if (now >= limit.blockUntil) {
      limit.blocked = false;
      limit.blockUntil = 0;
    }

    // Check request limit (100 requests per hour per platform per user)
    const maxRequests = 100;

    if (limit.requests.length >= maxRequests) {
      limit.blocked = true;
      limit.blockUntil = now + 300000; // Block for 5 minutes

      return new Response(
        JSON.stringify({
          allowed: false,
          message: 'Rate limit exceeded',
          retryAfter: 300,
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    limit.requests.push(now);

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: maxRequests - limit.requests.length,
        resetTime: Math.min(...limit.requests) + windowSize,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  async handleReset(request) {
    const data = await request.json();
    const { platformType, userId } = data;

    const key = `${platformType}:${userId}`;

    if (this.limits[key]) {
      delete this.limits[key];
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Rate limit reset' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  async handleStatus() {
    return new Response(
      JSON.stringify({
        limits: this.limits,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export { RateLimiter };

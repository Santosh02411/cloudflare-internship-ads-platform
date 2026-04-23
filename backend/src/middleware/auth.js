/**
 * Authentication Middleware
 */

import { verifyJWT } from '../utils/jwt.js';

async function authMiddleware(c, next) {
  const authHeader = c.req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET || 'dev-secret');

  if (!payload) {
    return c.json({ success: false, error: 'Invalid token' }, 401);
  }

  c.set('user', {
    userId: payload.userId,
    email: payload.email,
  });

  await next();
}

function requireAuth(handler) {
  return async (c) => {
    const authHeader = c.req.header('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, c.env.JWT_SECRET || 'dev-secret');

    if (!payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401);
    }

    // Attach user to request object
    Object.defineProperty(c.req, 'user', {
      value: {
        userId: payload.userId,
        email: payload.email,
      },
      writable: true,
      enumerable: true,
      configurable: true,
    });

    return handler(c);
  };
}

export {
  authMiddleware,
  requireAuth,
};

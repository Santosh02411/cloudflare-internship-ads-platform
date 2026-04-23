/**
 * JWT utilities for authentication
 */

async function generateJWT(payload, secret, expiresIn = 86400) {
  const encoder = new TextEncoder();
  const algorithm = 'HMAC';

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(jwtPayload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const message = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const keyBuffer = encoder.encode(secret);

  const signature = await crypto.subtle.sign(
    algorithm,
    await crypto.subtle.importKey('raw', keyBuffer, { name: algorithm, hash: 'SHA-256' }, false, ['sign']),
    message
  );

  const signatureArray = Array.from(new Uint8Array(signature));
  const encodedSignature = btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    const encoder = new TextEncoder();
    const keyBuffer = encoder.encode(secret);
    const signature = Uint8Array.from(
      atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );
    const message = encoder.encode(`${encodedHeader}.${encodedPayload}`);

    const key = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, message);

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function comparePasswords(password, hash) {
  if (!hash) {
    return false;
  }
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export {
  generateJWT,
  verifyJWT,
  hashPassword,
  comparePasswords,
};

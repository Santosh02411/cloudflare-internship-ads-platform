/**
 * Base Platform Adapter - Abstract class for platform integrations
 */

class BasePlatformAdapter {
  constructor(platformType, accessToken, refreshToken = null) {
    this.platformType = platformType;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  async authenticate(authCode, redirectUri) {
    throw new Error('authenticate() must be implemented');
  }

  async createAd(payload) {
    throw new Error('createAd() must be implemented');
  }

  async getStatus(adId) {
    throw new Error('getStatus() must be implemented');
  }

  async deleteAd(adId) {
    throw new Error('deleteAd() must be implemented');
  }

  async validateConnection() {
    throw new Error('validateConnection() must be implemented');
  }

  async makeRequest(method, endpoint, body = null, headers = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      ...headers,
    };

    const options = {
      method,
      headers: defaultHeaders,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  generateMockAdId() {
    return `ad_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }

  normalizePlatformResponse(response) {
    return {
      adId: response.adId || this.generateMockAdId(),
      status: response.status || 'pending',
      message: response.message,
      metadata: response.metadata,
    };
  }
}

export default BasePlatformAdapter;

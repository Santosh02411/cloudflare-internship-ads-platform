/**
 * Campaign Platform Repository - Handle campaign-platform associations
 */

class CampaignPlatformRepository {
  constructor(db) {
    this.db = db;
  }

  async create(campaignPlatform) {
    const now = new Date();

    await this.db.execute(
      `INSERT INTO campaign_platforms (id, campaign_id, platform_id, platform_type, status, ad_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        campaignPlatform.id,
        campaignPlatform.campaignId,
        campaignPlatform.platformId,
        campaignPlatform.platformType,
        campaignPlatform.status || 'pending',
        null,
        now.toISOString(),
        now.toISOString(),
      ]
    );

    return this.findById(campaignPlatform.id);
  }

  async findById(id) {
    return this.db.queryOne(
      `SELECT id, campaign_id as campaignId, platform_id as platformId, platform_type as platformType,
              status, ad_id as adId, api_response as apiResponse, error_message as errorMessage,
              retry_count as retryCount, last_retry_at as lastRetryAt, created_at as createdAt, updated_at as updatedAt
       FROM campaign_platforms WHERE id = ?`,
      [id]
    );
  }

  async findByCampaignId(campaignId) {
    const results = await this.db.query(
      `SELECT id, campaign_id as campaignId, platform_id as platformId, platform_type as platformType,
              status, ad_id as adId, api_response as apiResponse, error_message as errorMessage,
              retry_count as retryCount, last_retry_at as lastRetryAt, created_at as createdAt, updated_at as updatedAt
       FROM campaign_platforms WHERE campaign_id = ?`,
      [campaignId]
    );

    return results.map((r) => {
      if (r.apiResponse) {
        r.apiResponse = JSON.parse(r.apiResponse);
      }
      return r;
    });
  }

  async findByPlatformId(platformId) {
    return this.db.query(
      `SELECT id, campaign_id as campaignId, platform_id as platformId, platform_type as platformType,
              status, ad_id as adId, api_response as apiResponse, error_message as errorMessage,
              retry_count as retryCount, last_retry_at as lastRetryAt, created_at as createdAt, updated_at as updatedAt
       FROM campaign_platforms WHERE platform_id = ?`,
      [platformId]
    );
  }

  async update(id, updates) {
    const now = new Date();
    const fields = [];
    const values = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.adId !== undefined) {
      fields.push('ad_id = ?');
      values.push(updates.adId);
    }

    if (updates.apiResponse !== undefined) {
      fields.push('api_response = ?');
      values.push(JSON.stringify(updates.apiResponse));
    }

    if (updates.errorMessage !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.errorMessage);
    }

    if (updates.retryCount !== undefined) {
      fields.push('retry_count = ?');
      values.push(updates.retryCount);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(id);

    await this.db.execute(
      `UPDATE campaign_platforms SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async delete(id) {
    await this.db.execute(`DELETE FROM campaign_platforms WHERE id = ?`, [id]);
  }

  async deleteByCampaignId(campaignId) {
    await this.db.execute(`DELETE FROM campaign_platforms WHERE campaign_id = ?`, [campaignId]);
  }

  async getStatusSummary(campaignId) {
    return this.db.query(
      `SELECT platform_type as platformType, status, COUNT(*) as count
       FROM campaign_platforms WHERE campaign_id = ? GROUP BY platform_type, status`,
      [campaignId]
    );
  }
}

export default CampaignPlatformRepository;

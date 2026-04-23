/**
 * Job Repository - Handle publishing job database operations
 */

class JobRepository {
  constructor(db) {
    this.db = db;
  }

  normalizeDateValue(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }

  async create(job) {
    const now = new Date();

    await this.db.execute(
      `INSERT INTO publishing_jobs (id, campaign_id, campaign_platform_id, status, payload, retry_count, max_retries, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job.id,
        job.campaignId,
        job.campaignPlatformId,
        job.status || 'pending',
        JSON.stringify(job.payload),
        job.retryCount || 0,
        job.maxRetries || 3,
        now.toISOString(),
        now.toISOString(),
      ]
    );

    return this.findById(job.id);
  }

  async findById(id) {
    const result = await this.db.queryOne(
      `SELECT id, campaign_id as campaignId, campaign_platform_id as campaignPlatformId,
              status, payload, result, error_message as errorMessage, retry_count as retryCount,
              max_retries as maxRetries, next_retry_at as nextRetryAt, created_at as createdAt,
              updated_at as updatedAt, completed_at as completedAt
       FROM publishing_jobs WHERE id = ?`,
      [id]
    );

    if (result && result.payload) {
      result.payload = JSON.parse(result.payload);
    }

    if (result && result.result) {
      result.result = JSON.parse(result.result);
    }

    return result;
  }

  async findByCampaignId(campaignId) {
    const results = await this.db.query(
      `SELECT id, campaign_id as campaignId, campaign_platform_id as campaignPlatformId,
              status, payload, result, error_message as errorMessage, retry_count as retryCount,
              max_retries as maxRetries, next_retry_at as nextRetryAt, created_at as createdAt,
              updated_at as updatedAt, completed_at as completedAt
       FROM publishing_jobs WHERE campaign_id = ? ORDER BY created_at DESC`,
      [campaignId]
    );

    return results.map((r) => {
      if (r.payload) r.payload = JSON.parse(r.payload);
      if (r.result) r.result = JSON.parse(r.result);
      return r;
    });
  }

  async findByStatus(status, limit = 50, offset = 0) {
    const results = await this.db.query(
      `SELECT id, campaign_id as campaignId, campaign_platform_id as campaignPlatformId,
              status, payload, result, error_message as errorMessage, retry_count as retryCount,
              max_retries as maxRetries, next_retry_at as nextRetryAt, created_at as createdAt,
              updated_at as updatedAt, completed_at as completedAt
       FROM publishing_jobs WHERE status = ? ORDER BY created_at ASC LIMIT ? OFFSET ?`,
      [status, limit, offset]
    );

    return results.map((r) => {
      if (r.payload) r.payload = JSON.parse(r.payload);
      if (r.result) r.result = JSON.parse(r.result);
      return r;
    });
  }

  async findPending(limit = 50) {
    return this.findByStatus('pending', limit, 0);
  }

  async findRetrying() {
    const now = new Date();
    const results = await this.db.query(
      `SELECT id, campaign_id as campaignId, campaign_platform_id as campaignPlatformId,
              status, payload, result, error_message as errorMessage, retry_count as retryCount,
              max_retries as maxRetries, next_retry_at as nextRetryAt, created_at as createdAt,
              updated_at as updatedAt, completed_at as completedAt
       FROM publishing_jobs WHERE status = 'retrying' AND next_retry_at <= ? ORDER BY created_at ASC`,
      [now.toISOString()]
    );

    return results.map((r) => {
      if (r.payload) r.payload = JSON.parse(r.payload);
      if (r.result) r.result = JSON.parse(r.result);
      return r;
    });
  }

  async update(id, updates) {
    const now = new Date();
    const fields = [];
    const values = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.result !== undefined) {
      fields.push('result = ?');
      values.push(JSON.stringify(updates.result));
    }

    if (updates.errorMessage !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.errorMessage);
    }

    if (updates.retryCount !== undefined) {
      fields.push('retry_count = ?');
      values.push(updates.retryCount);
    }

    if (updates.nextRetryAt !== undefined) {
      fields.push('next_retry_at = ?');
      values.push(this.normalizeDateValue(updates.nextRetryAt));
    }

    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(this.normalizeDateValue(updates.completedAt));
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(id);

    await this.db.execute(
      `UPDATE publishing_jobs SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async delete(id) {
    await this.db.execute(`DELETE FROM publishing_jobs WHERE id = ?`, [id]);
  }

  async countByStatus(status) {
    const result = await this.db.queryOne(
      `SELECT COUNT(*) as count FROM publishing_jobs WHERE status = ?`,
      [status]
    );

    return result?.count || 0;
  }
}

export default JobRepository;

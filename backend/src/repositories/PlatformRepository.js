/**
 * Platform Repository - Handle platform account database operations
 */

class PlatformRepository {
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

  async create(platform) {
    const now = new Date();

    await this.db.execute(
      `INSERT INTO platforms (id, user_id, platform_type, access_token, refresh_token, token_expires_at, is_active, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        platform.id,
        platform.userId,
        platform.platformType,
        platform.accessToken,
        platform.refreshToken || null,
        this.normalizeDateValue(platform.tokenExpiresAt),
        platform.isActive ? 1 : 0,
        JSON.stringify(platform.metadata || {}),
        now.toISOString(),
        now.toISOString(),
      ]
    );

    return this.findById(platform.id);
  }

  async findById(id) {
    const result = await this.db.queryOne(
      `SELECT id, user_id as userId, platform_type as platformType, access_token as accessToken,
              refresh_token as refreshToken, token_expires_at as tokenExpiresAt, is_active as isActive,
              metadata, created_at as createdAt, updated_at as updatedAt
       FROM platforms WHERE id = ?`,
      [id]
    );

    if (result && result.metadata) {
      result.metadata = JSON.parse(result.metadata);
    }

    return result;
  }

  async findByUserAndType(userId, platformType) {
    const result = await this.db.queryOne(
      `SELECT id, user_id as userId, platform_type as platformType, access_token as accessToken,
              refresh_token as refreshToken, token_expires_at as tokenExpiresAt, is_active as isActive,
              metadata, created_at as createdAt, updated_at as updatedAt
       FROM platforms WHERE user_id = ? AND platform_type = ?`,
      [userId, platformType]
    );

    if (result && result.metadata) {
      result.metadata = JSON.parse(result.metadata);
    }

    return result;
  }

  async findByUserId(userId) {
    const results = await this.db.query(
      `SELECT id, user_id as userId, platform_type as platformType, access_token as accessToken,
              refresh_token as refreshToken, token_expires_at as tokenExpiresAt, is_active as isActive,
              metadata, created_at as createdAt, updated_at as updatedAt
       FROM platforms WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    return results.map((result) => {
      if (result.metadata) {
        result.metadata = JSON.parse(result.metadata);
      }
      return result;
    });
  }

  async update(id, updates) {
    const now = new Date();
    const fields = [];
    const values = [];

    if (updates.accessToken !== undefined) {
      fields.push('access_token = ?');
      values.push(updates.accessToken);
    }

    if (updates.refreshToken !== undefined) {
      fields.push('refresh_token = ?');
      values.push(updates.refreshToken);
    }

    if (updates.tokenExpiresAt !== undefined) {
      fields.push('token_expires_at = ?');
      values.push(this.normalizeDateValue(updates.tokenExpiresAt));
    }

    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(id);

    await this.db.execute(
      `UPDATE platforms SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async delete(id) {
    await this.db.execute(`DELETE FROM platforms WHERE id = ?`, [id]);
  }

  async deleteByUserAndType(userId, platformType) {
    await this.db.execute(
      `DELETE FROM platforms WHERE user_id = ? AND platform_type = ?`,
      [userId, platformType]
    );
  }
}

export default PlatformRepository;

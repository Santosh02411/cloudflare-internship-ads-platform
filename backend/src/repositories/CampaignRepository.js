/**
 * Campaign Repository - Handle campaign database operations
 */

class CampaignRepository {
  constructor(db) {
    this.db = db;
  }

  async create(campaign) {
    const now = new Date();

    await this.db.execute(
      `INSERT INTO campaigns (id, user_id, name, description, ad_copy, media_id, start_date, end_date, budget, status, a_b_variant, template_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        campaign.id,
        campaign.userId,
        campaign.name,
        campaign.description || '',
        campaign.adCopy,
        campaign.mediaId || null,
        campaign.startDate || null,
        campaign.endDate || null,
        campaign.budget || null,
        campaign.status || 'draft',
        campaign.abVariant || null,
        campaign.templateId || null,
        now.toISOString(),
        now.toISOString(),
      ]
    );

    return this.findById(campaign.id);
  }

  async findById(id) {
    return this.db.queryOne(
      `SELECT id, user_id as userId, name, description, ad_copy as adCopy, media_id as mediaId,
              start_date as startDate, end_date as endDate, budget, status, a_b_variant as abVariant,
              template_id as templateId, created_at as createdAt, updated_at as updatedAt, published_at as publishedAt
       FROM campaigns WHERE id = ?`,
      [id]
    );
  }

  async findByUserId(userId, limit = 50, offset = 0) {
    return this.db.query(
      `SELECT id, user_id as userId, name, description, ad_copy as adCopy, media_id as mediaId,
              start_date as startDate, end_date as endDate, budget, status, a_b_variant as abVariant,
              template_id as templateId, created_at as createdAt, updated_at as updatedAt, published_at as publishedAt
       FROM campaigns WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
  }

  async findByStatus(status, limit = 50, offset = 0) {
    return this.db.query(
      `SELECT id, user_id as userId, name, description, ad_copy as adCopy, media_id as mediaId,
              start_date as startDate, end_date as endDate, budget, status, a_b_variant as abVariant,
              template_id as templateId, created_at as createdAt, updated_at as updatedAt, published_at as publishedAt
       FROM campaigns WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [status, limit, offset]
    );
  }

  async update(id, updates) {
    const now = new Date();
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (updates.adCopy !== undefined) {
      fields.push('ad_copy = ?');
      values.push(updates.adCopy);
    }

    if (updates.budget !== undefined) {
      fields.push('budget = ?');
      values.push(updates.budget);
    }

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);

      if (updates.status === 'running') {
        fields.push('published_at = ?');
        values.push(now.toISOString());
      }
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(id);

    await this.db.execute(
      `UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async delete(id) {
    await this.db.execute(`DELETE FROM campaigns WHERE id = ?`, [id]);
  }

  async count(userId) {
    const result = await this.db.queryOne(
      `SELECT COUNT(*) as count FROM campaigns WHERE user_id = ?`,
      [userId]
    );

    return result?.count || 0;
  }
}

export default CampaignRepository;

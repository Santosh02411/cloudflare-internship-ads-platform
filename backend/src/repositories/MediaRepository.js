/**
 * Media Repository - Handle media database operations
 */

class MediaRepository {
  constructor(db) {
    this.db = db;
  }

  async create(media) {
    const now = new Date();

    await this.db.execute(
      `INSERT INTO media (id, user_id, filename, file_url, file_type, file_size, width, height, r2_key, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        media.id,
        media.userId,
        media.filename,
        media.fileUrl,
        media.fileType,
        media.fileSize,
        media.width || null,
        media.height || null,
        media.r2Key,
        JSON.stringify(media.metadata || {}),
        now.toISOString(),
      ]
    );

    return this.findById(media.id);
  }

  async findById(id) {
    const result = await this.db.queryOne(
      `SELECT id, user_id as userId, filename, file_url as fileUrl, file_type as fileType,
              file_size as fileSize, width, height, r2_key as r2Key, metadata, created_at as createdAt
       FROM media WHERE id = ?`,
      [id]
    );

    if (result && result.metadata) {
      result.metadata = JSON.parse(result.metadata);
    }

    return result;
  }

  async findByUserId(userId, limit = 50, offset = 0) {
    const results = await this.db.query(
      `SELECT id, user_id as userId, filename, file_url as fileUrl, file_type as fileType,
              file_size as fileSize, width, height, r2_key as r2Key, metadata, created_at as createdAt
       FROM media WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return results.map((result) => {
      if (result.metadata) {
        result.metadata = JSON.parse(result.metadata);
      }
      return result;
    });
  }

  async delete(id) {
    await this.db.execute(`DELETE FROM media WHERE id = ?`, [id]);
  }

  async count(userId) {
    const result = await this.db.queryOne(
      `SELECT COUNT(*) as count FROM media WHERE user_id = ?`,
      [userId]
    );

    return result?.count || 0;
  }
}

export default MediaRepository;

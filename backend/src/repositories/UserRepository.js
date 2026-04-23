/**
 * User Repository - Handle user database operations
 */

class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async create(user) {
    const now = new Date();

    await this.db.execute(
      `INSERT INTO users (id, email, password_hash, name, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, '', user.name || '', user.avatarUrl || '', now.toISOString(), now.toISOString()]
    );

    return this.findById(user.id);
  }

  async findById(id) {
    return this.db.queryOne(
      `SELECT id, email, name, avatar_url as avatarUrl, created_at as createdAt, updated_at as updatedAt
       FROM users WHERE id = ?`,
      [id]
    );
  }

  async findByEmail(email) {
    return this.db.queryOne(
      `SELECT id, email, name, avatar_url as avatarUrl, created_at as createdAt, updated_at as updatedAt
       FROM users WHERE email = ?`,
      [email]
    );
  }

  async getPasswordHash(userId) {
    const result = await this.db.queryOne(
      `SELECT password_hash FROM users WHERE id = ?`,
      [userId]
    );

    return result?.password_hash || null;
  }

  async updatePasswordHash(userId, hash) {
    const now = new Date();

    await this.db.execute(
      `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      [hash, now.toISOString(), userId]
    );
  }

  async update(userId, updates) {
    const now = new Date();
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.avatarUrl !== undefined) {
      fields.push('avatar_url = ?');
      values.push(updates.avatarUrl);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(userId);

    await this.db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async delete(userId) {
    await this.db.execute(`DELETE FROM users WHERE id = ?`, [userId]);
  }

  async list(limit = 50, offset = 0) {
    return this.db.query(
      `SELECT id, email, name, avatar_url as avatarUrl, created_at as createdAt, updated_at as updatedAt
       FROM users LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }
}

export default UserRepository;

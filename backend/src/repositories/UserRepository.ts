import { DatabaseService } from '../utils/db';
import { User } from '../../../shared/types/user';

export class UserRepository {
  constructor(private db: DatabaseService) {}

  async create(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date();

    await this.db.execute(
      `INSERT INTO users (id, email, password_hash, name, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, '', user.name || '', user.avatarUrl || '', now.toISOString(), now.toISOString()]
    );

    return this.findById(user.id) as Promise<User>;
  }

  async findById(id: string): Promise<User | null> {
    return this.db.queryOne<User>(
      `SELECT id, email, name, avatar_url as avatarUrl, created_at as createdAt, updated_at as updatedAt
       FROM users WHERE id = ?`,
      [id]
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.queryOne<User>(
      `SELECT id, email, name, avatar_url as avatarUrl, created_at as createdAt, updated_at as updatedAt
       FROM users WHERE email = ?`,
      [email]
    );
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const result = await this.db.queryOne<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = ?`,
      [userId]
    );

    return result?.password_hash || null;
  }

  async updatePasswordHash(userId: string, hash: string): Promise<void> {
    const now = new Date();

    await this.db.execute(
      `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      [hash, now.toISOString(), userId]
    );
  }

  async update(userId: string, updates: Partial<User>): Promise<void> {
    const now = new Date();
    const fields: string[] = [];
    const values: any[] = [];

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

  async delete(userId: string): Promise<void> {
    await this.db.execute(`DELETE FROM users WHERE id = ?`, [userId]);
  }

  async list(limit: number = 50, offset: number = 0): Promise<User[]> {
    return this.db.query<User>(
      `SELECT id, email, name, avatar_url as avatarUrl, created_at as createdAt, updated_at as updatedAt
       FROM users LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }
}

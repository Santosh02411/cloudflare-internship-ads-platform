import { D1Database, D1Result } from '../types';

export class DatabaseService {
  constructor(private db: D1Database) {}

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
      let statement = this.db.prepare(sql);

      if (params && params.length > 0) {
        statement = statement.bind(...params);
      }

      const result = await statement.all();

      if (!result.success) {
        throw new Error(`Database query failed: ${sql}`);
      }

      return (result.results || []) as T[];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    try {
      const results = await this.query<T>(sql, params);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Database queryOne error:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<D1Result> {
    try {
      let statement = this.db.prepare(sql);

      if (params && params.length > 0) {
        statement = statement.bind(...params);
      }

      const result = await statement.run();

      if (!result.success) {
        throw new Error(`Database execution failed: ${sql}`);
      }

      return result;
    } catch (error) {
      console.error('Database execution error:', error);
      throw error;
    }
  }

  async batch(statements: Array<{ sql: string; params?: any[] }>): Promise<D1Result[]> {
    try {
      const batch = statements.map((stmt) => {
        let statement = this.db.prepare(stmt.sql);

        if (stmt.params && stmt.params.length > 0) {
          statement = statement.bind(...stmt.params);
        }

        return statement;
      });

      const results = await this.db.batch(batch);
      return results;
    } catch (error) {
      console.error('Database batch error:', error);
      throw error;
    }
  }

  async transaction<T>(fn: (db: DatabaseService) => Promise<T>): Promise<T> {
    try {
      await this.execute('BEGIN TRANSACTION');
      const result = await fn(this);
      await this.execute('COMMIT');
      return result;
    } catch (error) {
      await this.execute('ROLLBACK');
      throw error;
    }
  }
}

export function createDatabaseService(db: D1Database): DatabaseService {
  return new DatabaseService(db);
}

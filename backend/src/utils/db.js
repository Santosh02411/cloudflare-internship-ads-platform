/**
 * Database service for D1 operations
 */

class DatabaseService {
  constructor(db) {
    this.db = db;
  }

  async query(sql, params = []) {
    try {
      let statement = this.db.prepare(sql);

      if (params && params.length > 0) {
        statement = statement.bind(...params);
      }

      const result = await statement.all();

      if (!result.success) {
        throw new Error(`Database query failed: ${sql}`);
      }

      return result.results || [];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async queryOne(sql, params = []) {
    try {
      const results = await this.query(sql, params);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Database queryOne error:', error);
      throw error;
    }
  }

  async execute(sql, params = []) {
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

  async batch(statements) {
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

  async transaction(fn) {
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

function createDatabaseService(db) {
  return new DatabaseService(db);
}

export {
  DatabaseService,
  createDatabaseService,
};

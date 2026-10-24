import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// PostgreSQL Connection Pool Configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/miniledger',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
};

export const pgPool = new Pool(poolConfig);

/**
 * Test PostgreSQL connection and automatically initialize schema if connected
 */
export const connectPostgreSQL = async () => {
  try {
    const client = await pgPool.connect();
    console.log('🐘 PostgreSQL connected successfully');

    // Run schema.sql migration if tables do not exist
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(sql);
      console.log('✅ PostgreSQL Schema verified & migrated successfully');
    }

    client.release();
    return true;
  } catch (err) {
    console.warn(`ℹ️ PostgreSQL not active on localhost:5432 (${err.message})`);
    console.log('🔄 Continuing with zero-config in-memory database engine for seamless demo execution.');
    return false;
  }
};

export default pgPool;


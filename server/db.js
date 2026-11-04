import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      role VARCHAR(20) NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(30) NOT NULL,
      password_hash TEXT NOT NULL,
      city VARCHAR(100) DEFAULT 'Almaty',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      university VARCHAR(255) NOT NULL,
      faculty VARCHAR(255) NOT NULL,
      course INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      position VARCHAR(255) NOT NULL,
      organization_type VARCHAR(50) NOT NULL,
      university VARCHAR(255),
      dormitory_name VARCHAR(255) NOT NULL,
      dormitory_address TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      reply TEXT NOT NULL,
      language VARCHAR(10) DEFAULT 'kk',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("PostgreSQL tables are ready");
}

export default pool;
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

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS blocked_by INTEGER;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS block_reason TEXT;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;


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


    CREATE TABLE IF NOT EXISTS dormitories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      university VARCHAR(255),
      address TEXT,
      total_places INTEGER DEFAULT 0,
      occupied_places INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      dormitory_id INTEGER
        REFERENCES dormitories(id) ON DELETE SET NULL,
      status VARCHAR(30) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      description TEXT,
      status VARCHAR(30) DEFAULT 'pending',
      priority VARCHAR(30) DEFAULT 'normal',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS user_blocks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      blocked_by INTEGER
        REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      blocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      unblocked_at TIMESTAMPTZ,
      active BOOLEAN DEFAULT TRUE
    );


    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      target_user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
  `);

  console.log("SmartDorm PostgreSQL tables are ready");
}

export default pool;
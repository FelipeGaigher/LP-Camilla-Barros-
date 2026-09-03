export const name = '001_create-tables'

export async function up(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      token VARCHAR(128) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS site_sections (
      section_key VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id SERIAL PRIMARY KEY,
      ip_address VARCHAR(45) NOT NULL,
      username VARCHAR(100) NOT NULL,
      attempted_at TIMESTAMPTZ DEFAULT NOW(),
      success BOOLEAN DEFAULT FALSE
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name VARCHAR(160),
      phone VARCHAR(40),
      email VARCHAR(200),
      interest VARCHAR(160),
      message TEXT,
      source VARCHAR(60),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      section_key VARCHAR(50),
      action VARCHAR(20),
      old_data JSONB,
      new_data JSONB,
      user_id INTEGER,
      username VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions(token)`
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_attempts_ip ON login_attempts(ip_address, attempted_at DESC)`
}

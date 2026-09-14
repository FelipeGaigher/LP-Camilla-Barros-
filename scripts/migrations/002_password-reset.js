export const name = '002_password-reset'

/**
 * Recuperacao de senha por e-mail.
 *
 * admin_users nao tinha e-mail — o login sempre foi so username. Sem endereco
 * nao da pra mandar o link de recuperacao, entao a coluna entra aqui.
 *
 * password_reset_tokens guarda o HMAC-SHA256 do token, nunca o token em si:
 * o valor em claro existe apenas dentro do e-mail. Se o banco vazar, os links
 * pendentes continuam inuteis.
 */
export async function up(sql) {
  await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email VARCHAR(200)`

  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      token_hash VARCHAR(128) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS idx_reset_hash ON password_reset_tokens(token_hash)`
}

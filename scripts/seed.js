import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { getDb } from '../api/_lib/db.js'
import { defaults } from '../client/src/data/defaults.js'

dotenv.config({ path: '.env.local' })
dotenv.config()

async function run() {
  const sql = getDb()

  const username = process.env.ADMIN_USER || 'camilla'
  const password = process.env.ADMIN_PASSWORD
  const email = process.env.ADMIN_EMAIL || null
  if (!password || password.length < 8) {
    console.error('Defina ADMIN_PASSWORD no .env.local com pelo menos 8 caracteres.')
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)
  await sql`
    INSERT INTO admin_users (username, password_hash, email)
    VALUES (${username}, ${hash}, ${email})
    ON CONFLICT (username)
    DO UPDATE SET password_hash = ${hash}, email = COALESCE(${email}, admin_users.email), updated_at = NOW()
  `
  console.log(`[ok] usuario admin "${username}" criado/atualizado`)
  if (!email) {
    console.log('     (sem ADMIN_EMAIL: o "esqueci a senha" fica indisponivel ate cadastrar um e-mail)')
  }

  for (const [key, value] of Object.entries(defaults)) {
    // JSON.stringify direto: o Postgres faz o cast text -> jsonb na coluna.
    // O sql.json() do postgres.js nao existe no driver do Neon.
    await sql`
      INSERT INTO site_sections (section_key, data, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}, NOW())
      ON CONFLICT (section_key) DO NOTHING
    `
    console.log(`[ok] secao "${key}" semeada`)
  }

  console.log('\nSeed concluido.')
}

run().catch((err) => {
  console.error('Falha no seed:', err)
  process.exit(1)
})

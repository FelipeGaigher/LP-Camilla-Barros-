import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { getDb, closeDb } from '../api/_lib/db.js'
import { defaults } from '../client/src/data/defaults.js'

async function run() {
  const sql = getDb()

  const username = process.env.ADMIN_USER || 'camilla'
  const password = process.env.ADMIN_PASSWORD
  if (!password || password.length < 8) {
    console.error('Defina ADMIN_PASSWORD no .env com pelo menos 8 caracteres.')
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)
  await sql`
    INSERT INTO admin_users (username, password_hash)
    VALUES (${username}, ${hash})
    ON CONFLICT (username) DO UPDATE SET password_hash = ${hash}, updated_at = NOW()
  `
  console.log(`[ok] usuario admin "${username}" criado/atualizado`)

  for (const [key, value] of Object.entries(defaults)) {
    await sql`
      INSERT INTO site_sections (section_key, data, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW())
      ON CONFLICT (section_key) DO NOTHING
    `
    console.log(`[ok] secao "${key}" semeada`)
  }

  await closeDb()
  console.log('\nSeed concluido.')
}

run().catch(async (err) => {
  console.error('Falha no seed:', err)
  await closeDb()
  process.exit(1)
})

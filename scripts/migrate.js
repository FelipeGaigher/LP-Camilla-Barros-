import dotenv from 'dotenv'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getDb } from '../api/_lib/db.js'

dotenv.config({ path: '.env.local' })
dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

async function run() {
  const sql = getDb()
  await ensureTable(sql)

  const applied = new Set((await sql`SELECT name FROM migrations`).map((r) => r.name))
  const files = (await fs.readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.js')).sort()

  const statusOnly = process.argv.includes('--status')

  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(MIGRATIONS_DIR, file)).href)
    const migName = mod.name || file.replace('.js', '')
    const done = applied.has(migName)

    if (statusOnly) {
      console.log(`${done ? '[ok]     ' : '[pendente]'} ${migName}`)
      continue
    }
    if (done) {
      console.log(`[pulando] ${migName}`)
      continue
    }

    console.log(`[rodando] ${migName}`)
    await mod.up(sql)
    await sql`INSERT INTO migrations (name) VALUES (${migName})`
    console.log(`[ok]      ${migName}`)
  }
}

// neon() fala HTTP: nao ha conexao pra fechar no fim.
run().catch((err) => {
  console.error('Falha na migracao:', err)
  process.exit(1)
})

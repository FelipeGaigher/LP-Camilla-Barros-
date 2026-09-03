import postgres from 'postgres'

let sql

/**
 * Conexao unica com o PostgreSQL do servidor.
 * Usa tagged templates (mesma sintaxe do Neon serverless usado no Ibira),
 * entao os handlers sao portaveis entre VPS e serverless.
 */
export function getDb() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL nao configurada. Copie .env.example para .env.')
    }
    sql = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      transform: { undefined: null },
    })
  }
  return sql
}

export async function closeDb() {
  if (sql) await sql.end()
  sql = undefined
}

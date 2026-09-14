import { neon } from '@neondatabase/serverless'

let sql

/**
 * Conexao com o Neon Postgres.
 *
 * neon() fala HTTP, nao socket: cada query e um POST independente. E isso que
 * torna o handler seguro em serverless — nao existe pool pra vazar entre
 * invocacoes, nem conexao ociosa segurando slot no banco.
 *
 * O singleton em variavel de modulo aproveita a lambda quente entre requests.
 */
export function getDb() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL nao configurada. Copie .env.example para .env.local.')
    }
    sql = neon(process.env.DATABASE_URL)
  }
  return sql
}

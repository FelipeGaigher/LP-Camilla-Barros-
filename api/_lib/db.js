import { neon, neonConfig } from '@neondatabase/serverless'

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

    // Desenvolvimento contra um Postgres local em vez do banco de producao.
    // O driver do Neon so fala o protocolo SQL-over-HTTP, entao quem traduz e
    // um proxy; NEON_HTTP_PROXY aponta pra ele. Sem a variavel nada muda, e em
    // producao ela nao existe.
    //
    // Levantar o par (veja DEPLOY.md):
    //   docker run -d --name lp-pg --network camilla-net ... postgres:17-alpine
    //   docker run -d --name lp-neon-proxy --network camilla-net -p 4444:4444 \
    //     -e PG_CONNECTION_STRING=postgres://postgres:teste@lp-pg:5432/camilla \
    //     ghcr.io/timowilhelm/local-neon-http-proxy:main
    const proxy = process.env.NEON_HTTP_PROXY
    if (proxy) {
      neonConfig.fetchEndpoint = proxy
      neonConfig.useSecureWebSocket = false
      neonConfig.poolQueryViaFetch = true
      console.warn(`[db] usando proxy local em ${proxy} — nao e o banco de producao`)
    }

    sql = neon(process.env.DATABASE_URL)
  }
  return sql
}

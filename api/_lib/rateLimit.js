import { getDb } from './db.js'

const MAX_ATTEMPTS = 6
const WINDOW_MINUTES = 15

// Leads usam a mesma tabela, marcados por este username reservado.
// Nao vale a pena uma tabela so pra isso — a janela de contagem e a mesma.
const LEAD_MARKER = '__lead__'
const LEAD_MAX = 5
const LEAD_WINDOW_MINUTES = 10

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return String(fwd).split(',')[0].trim()
  return req.socket?.remoteAddress || 'desconhecido'
}

export async function isRateLimited(ip) {
  const sql = getDb()
  const rows = await sql`
    SELECT COUNT(*)::int AS total
    FROM login_attempts
    WHERE ip_address = ${ip}
      AND username <> ${LEAD_MARKER}
      AND success = FALSE
      AND attempted_at > NOW() - ${WINDOW_MINUTES + ' minutes'}::interval
  `
  return (rows[0]?.total || 0) >= MAX_ATTEMPTS
}

export async function recordAttempt(ip, username, success) {
  const sql = getDb()
  await sql`
    INSERT INTO login_attempts (ip_address, username, success)
    VALUES (${ip}, ${username || ''}, ${!!success})
  `
}

/**
 * Trava de envio do formulario publico.
 *
 * Antes o honeypot era a unica barreira. Agora cada lead dispara um e-mail,
 * entao um flood custa reputacao de remetente, nao so linha no banco.
 */
export async function isLeadRateLimited(ip) {
  const sql = getDb()
  const rows = await sql`
    SELECT COUNT(*)::int AS total
    FROM login_attempts
    WHERE ip_address = ${ip}
      AND username = ${LEAD_MARKER}
      AND attempted_at > NOW() - ${LEAD_WINDOW_MINUTES + ' minutes'}::interval
  `
  return (rows[0]?.total || 0) >= LEAD_MAX
}

export async function recordLead(ip) {
  const sql = getDb()
  await sql`
    INSERT INTO login_attempts (ip_address, username, success)
    VALUES (${ip}, ${LEAD_MARKER}, TRUE)
  `
}

import { getDb } from './db.js'

const MAX_ATTEMPTS = 6
const WINDOW_MINUTES = 15

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return String(fwd).split(',')[0].trim()
  return req.socket?.remoteAddress || 'desconhecido'
}

export async function isRateLimited(ip, username) {
  const sql = getDb()
  const rows = await sql`
    SELECT COUNT(*)::int AS total
    FROM login_attempts
    WHERE ip_address = ${ip}
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

import crypto from 'node:crypto'
import { getDb } from './db.js'
import { getSessionCookie } from './cookies.js'

const SESSION_DAYS = 7

export function makeToken() {
  return crypto.randomBytes(48).toString('hex')
}

/**
 * Valida a sessao da request contra admin_sessions.
 *
 * Le o cookie httpOnly primeiro. O header Authorization: Bearer fica como
 * fallback pra chamadas fora do navegador (curl, teste manual).
 */
export async function requireAuth(req) {
  const token = getSessionCookie(req) || bearerToken(req)
  if (!token) return { authorized: false }

  const sql = getDb()
  const rows = await sql`
    SELECT s.user_id, u.username, u.email
    FROM admin_sessions s
    JOIN admin_users u ON u.id = s.user_id
    WHERE s.token = ${token}
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
  `
  if (rows.length === 0) return { authorized: false }
  return {
    authorized: true,
    userId: rows[0].user_id,
    username: rows[0].username,
    email: rows[0].email,
    token,
  }
}

export function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  return String(header).replace('Bearer ', '').trim()
}

export async function createSession(userId) {
  const sql = getDb()
  const token = makeToken()
  await sql`
    INSERT INTO admin_sessions (user_id, token, expires_at)
    VALUES (${userId}, ${token}, NOW() + ${SESSION_DAYS + ' days'}::interval)
  `
  return token
}

export async function destroySession(token) {
  if (!token) return
  const sql = getDb()
  await sql`DELETE FROM admin_sessions WHERE token = ${token}`
}

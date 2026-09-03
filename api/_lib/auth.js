import crypto from 'node:crypto'
import { getDb } from './db.js'

const SESSION_DAYS = 7

export function makeToken() {
  return crypto.randomBytes(48).toString('hex')
}

/**
 * Valida o Bearer token do header Authorization contra admin_sessions.
 */
export async function requireAuth(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = String(header).replace('Bearer ', '').trim()
  if (!token) return { authorized: false }

  const sql = getDb()
  const rows = await sql`
    SELECT s.user_id, u.username
    FROM admin_sessions s
    JOIN admin_users u ON u.id = s.user_id
    WHERE s.token = ${token}
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
  `
  if (rows.length === 0) return { authorized: false }
  return { authorized: true, userId: rows[0].user_id, username: rows[0].username }
}

/**
 * Middleware Express: bloqueia a rota se nao houver sessao valida.
 */
export async function authGuard(req, res, next) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return res.status(401).json({ error: 'Nao autorizado' })
    req.auth = auth
    next()
  } catch (err) {
    console.error('authGuard:', err)
    res.status(500).json({ error: 'Erro interno' })
  }
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

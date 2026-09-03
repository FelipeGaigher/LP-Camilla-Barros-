import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getDb } from '../_lib/db.js'
import { authGuard, createSession, destroySession } from '../_lib/auth.js'
import { clientIp, isRateLimited, recordAttempt } from '../_lib/rateLimit.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  const ip = clientIp(req)

  try {
    if (await isRateLimited(ip, username)) {
      return res.status(429).json({ ok: false, error: 'Muitas tentativas. Aguarde 15 minutos.' })
    }

    const sql = getDb()
    const rows = await sql`
      SELECT id, username, password_hash FROM admin_users WHERE username = ${String(username || '').trim()}
    `
    const user = rows[0]
    const valid = user && (await bcrypt.compare(String(password || ''), user.password_hash))

    await recordAttempt(ip, username, !!valid)

    if (!valid) return res.status(401).json({ ok: false, error: 'Usuario ou senha invalidos' })

    const token = await createSession(user.id)
    return res.status(200).json({ ok: true, token, username: user.username })
  } catch (err) {
    console.error('POST /auth/login', err)
    return res.status(500).json({ ok: false, error: 'Erro interno' })
  }
})

router.post('/logout', async (req, res) => {
  try {
    const token = String(req.headers.authorization || '').replace('Bearer ', '').trim()
    await destroySession(token)
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(200).json({ ok: true })
  }
})

router.post('/change-password', authGuard, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  try {
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ ok: false, error: 'A nova senha precisa ter ao menos 8 caracteres.' })
    }

    const sql = getDb()
    const rows = await sql`SELECT id, password_hash FROM admin_users WHERE id = ${req.auth.userId}`
    const user = rows[0]
    if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.password_hash))) {
      return res.status(401).json({ ok: false, error: 'Senha atual incorreta' })
    }

    const hash = await bcrypt.hash(String(newPassword), 12)
    await sql`UPDATE admin_users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${user.id}`
    await sql`DELETE FROM admin_sessions WHERE user_id = ${user.id}`

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('POST /auth/change-password', err)
    return res.status(500).json({ ok: false, error: 'Erro interno' })
  }
})

export default router

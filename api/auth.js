import bcrypt from 'bcryptjs'
import { getDb } from './_lib/db.js'
import { ensureAdmin } from './_lib/ensureAdmin.js'
import { requireAuth, createSession, destroySession } from './_lib/auth.js'
import { setSessionCookie, clearSessionCookie, getSessionCookie } from './_lib/cookies.js'
import { checkOrigin } from './_lib/origin.js'
import { clientIp, isRateLimited, recordAttempt } from './_lib/rateLimit.js'
import { generateResetToken, hashResetToken, getTokenExpiry } from './_lib/resetTokens.js'
import { sendBrevoEmail } from './_lib/brevo.js'
import { passwordResetEmail } from './_lib/emailTemplates.js'

/**
 * Tudo de autenticacao num handler so, selecionado por ?action=.
 *
 * O plano Hobby da Vercel permite 12 funcoes serverless. Seis rotas de auth em
 * seis arquivos gastariam metade do orcamento em algo que a Camilla usa uma vez
 * por semana. Mesma convencao dos outros projetos.
 *
 * Acoes: login | logout | me | change-password | forgot-password | reset-password
 */
export default async function handler(req, res) {
  const action = String(req.query?.action || '')

  try {
    await ensureAdmin()

    if (req.method !== 'POST' && !(req.method === 'GET' && action === 'me')) {
      return res.status(405).json({ ok: false, error: 'Metodo nao permitido' })
    }
    if (req.method === 'POST' && !checkOrigin(req)) {
      return res.status(403).json({ ok: false, error: 'Origem nao permitida' })
    }

    switch (action) {
      case 'login':
        return await login(req, res)
      case 'logout':
        return await logout(req, res)
      case 'me':
        return await me(req, res)
      case 'change-password':
        return await changePassword(req, res)
      case 'forgot-password':
        return await forgotPassword(req, res)
      case 'reset-password':
        return await resetPassword(req, res)
      default:
        return res.status(400).json({ ok: false, error: 'Acao desconhecida' })
    }
  } catch (err) {
    console.error(`/api/auth?action=${action}:`, err)
    return res.status(500).json({ ok: false, error: 'Erro interno' })
  }
}

async function login(req, res) {
  const { username, password } = req.body || {}
  const ip = clientIp(req)

  if (await isRateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'Muitas tentativas. Aguarde 15 minutos.' })
  }

  const sql = getDb()
  const rows = await sql`
    SELECT id, username, password_hash
    FROM admin_users
    WHERE username = ${String(username || '').trim()}
  `
  const user = rows[0]
  const valid = user && (await bcrypt.compare(String(password || ''), user.password_hash))

  await recordAttempt(ip, username, !!valid)
  if (!valid) return res.status(401).json({ ok: false, error: 'Usuario ou senha invalidos' })

  const token = await createSession(user.id)
  setSessionCookie(req, res, token)
  return res.status(200).json({ ok: true, username: user.username })
}

async function logout(req, res) {
  try {
    await destroySession(getSessionCookie(req))
  } catch {}
  clearSessionCookie(req, res)
  return res.status(200).json({ ok: true })
}

/**
 * Re-hidrata a sessao no boot do front. Com o token em cookie httpOnly o
 * JavaScript nao consegue mais ler quem esta logado — quem responde e o servidor.
 */
async function me(req, res) {
  res.setHeader('Cache-Control', 'no-store, must-revalidate')
  const auth = await requireAuth(req)
  if (!auth.authorized) return res.status(401).json({ ok: false })
  return res.status(200).json({ ok: true, username: auth.username, email: auth.email || '' })
}

async function changePassword(req, res) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return res.status(401).json({ ok: false, error: 'Nao autorizado' })

  const { currentPassword, newPassword } = req.body || {}
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ ok: false, error: 'A nova senha precisa ter ao menos 8 caracteres.' })
  }

  const sql = getDb()
  const rows = await sql`SELECT id, password_hash FROM admin_users WHERE id = ${auth.userId}`
  const user = rows[0]
  if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.password_hash))) {
    return res.status(401).json({ ok: false, error: 'Senha atual incorreta' })
  }

  const hash = await bcrypt.hash(String(newPassword), 12)
  await sql`UPDATE admin_users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${user.id}`
  await sql`DELETE FROM admin_sessions WHERE user_id = ${user.id}`

  clearSessionCookie(req, res)
  return res.status(200).json({ ok: true })
}

/**
 * Responde 200 sempre, exista o e-mail ou nao. Uma resposta diferente por
 * e-mail inexistente transformaria este endpoint num verificador de cadastro.
 */
async function forgotPassword(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const ip = clientIp(req)

  if (await isRateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'Muitas tentativas. Aguarde 15 minutos.' })
  }
  await recordAttempt(ip, `forgot:${email}`, false)

  const resposta = { ok: true, message: 'Se o e-mail estiver cadastrado, o link chega em instantes.' }
  if (!email) return res.status(200).json(resposta)

  const sql = getDb()
  const rows = await sql`SELECT id, username, email FROM admin_users WHERE LOWER(email) = ${email}`
  const user = rows[0]
  if (!user) return res.status(200).json(resposta)

  // Um link por vez: pedir de novo invalida o anterior.
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${user.id} AND used_at IS NULL`

  const token = generateResetToken()
  await sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${hashResetToken(token)}, ${getTokenExpiry().toISOString()})
  `

  const base = (process.env.APP_URL || '').replace(/\/$/, '')
  const resetUrl = `${base}/gestao/login?reset=${token}`
  const { subject, htmlContent, textContent } = passwordResetEmail({ username: user.username, resetUrl })
  await sendBrevoEmail({ to: user.email, subject, htmlContent, textContent })

  return res.status(200).json(resposta)
}

async function resetPassword(req, res) {
  const token = String(req.body?.token || '').trim()
  const newPassword = String(req.body?.newPassword || '')

  if (!token) return res.status(400).json({ ok: false, error: 'Link invalido.' })
  if (newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: 'A nova senha precisa ter ao menos 8 caracteres.' })
  }

  const sql = getDb()
  const rows = await sql`
    SELECT id, user_id
    FROM password_reset_tokens
    WHERE token_hash = ${hashResetToken(token)}
      AND used_at IS NULL
      AND expires_at > NOW()
  `
  const row = rows[0]
  if (!row) return res.status(400).json({ ok: false, error: 'Link invalido ou expirado. Peca um novo.' })

  const hash = await bcrypt.hash(newPassword, 12)
  await sql`UPDATE admin_users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${row.user_id}`
  await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${row.id}`
  // Trocar a senha por recuperacao derruba todo mundo que estava logado.
  await sql`DELETE FROM admin_sessions WHERE user_id = ${row.user_id}`

  return res.status(200).json({ ok: true })
}

// Cookie de sessao httpOnly. Sem dependencia externa.
//
// O token saiu do sessionStorage: la ele era legivel por qualquer script da
// pagina e morria ao fechar a aba. Em cookie httpOnly o JavaScript nao alcanca
// e a sessao dura os 7 dias de admin_sessions.

const COOKIE_NAME = 'camilla_session'
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60 // 7 dias, alinhado com SESSION_DAYS em auth.js

/**
 * Le o cookie de sessao da request. String vazia se nao existir.
 */
export function getSessionCookie(req) {
  const raw = req.headers?.cookie
  if (!raw) return ''
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join('='))
  }
  return ''
}

/**
 * Em localhost o navegador recusa cookie marcado como Secure sobre http://,
 * entao a flag so entra fora do dev.
 */
function isLocalhost(req) {
  const host = req.headers?.host || ''
  return host.startsWith('localhost') || host.startsWith('127.0.0.1')
}

export function setSessionCookie(req, res, token) {
  const secure = isLocalhost(req) ? '' : 'Secure; '
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`
  )
}

export function clearSessionCookie(req, res) {
  const secure = isLocalhost(req) ? '' : 'Secure; '
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=0`)
}

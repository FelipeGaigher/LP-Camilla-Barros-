// Tokens de recuperacao de senha.
//
// O banco guarda so o HMAC-SHA256 do token. O valor em claro existe apenas
// dentro do e-mail — se o banco vazar, os links pendentes nao servem pra nada.
//
// Fluxo:
//   1. forgot-password gera o token, salva o hash, manda o claro por e-mail
//   2. a Camilla clica no link, o front devolve o token em claro
//   3. o backend hasheia de novo e procura por hash em password_reset_tokens

import crypto from 'node:crypto'

const TOKEN_BYTES = 32 // 64 chars em hex
const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hora

function getSecret() {
  const secret = process.env.RESET_TOKEN_HMAC_SECRET
  if (!secret) {
    console.warn('[resetTokens] RESET_TOKEN_HMAC_SECRET ausente — fallback inseguro, so vale em dev.')
    return 'dev-only-insecure-fallback-defina-RESET_TOKEN_HMAC_SECRET'
  }
  return secret
}

export function generateResetToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex')
}

/** Deterministico: o mesmo token sempre gera o mesmo hash. */
export function hashResetToken(plaintext) {
  return crypto.createHmac('sha256', getSecret()).update(plaintext).digest('hex')
}

export function getTokenExpiry() {
  return new Date(Date.now() + TOKEN_TTL_MS)
}

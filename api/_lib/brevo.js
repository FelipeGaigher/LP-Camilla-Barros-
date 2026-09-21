// Wrapper HTTP do Brevo. Sem SDK — fetch direto na API v3.
//
// Sem BREVO_API_KEY vira no-op silencioso e devolve { skipped: true }. E o que
// permite rodar local, e fazer deploy antes da conta de e-mail existir, sem
// nada quebrar.

const BREVO_API_BASE = 'https://api.brevo.com/v3'
const DEFAULT_SENDER_NAME = 'Dra. Camilla Barros'

function getSender() {
  return {
    name: process.env.BREVO_SENDER_NAME || DEFAULT_SENDER_NAME,
    email: process.env.BREVO_SENDER_EMAIL || 'no-reply@brevo-sender.net',
  }
}

/**
 * Envia e-mail transacional.
 *
 * Quem chama SEMPRE espera (`await`). Nao existe envio solto aqui: na Vercel a
 * funcao congela no instante em que a resposta sai, e promise pendente morre
 * junto — o e-mail nunca chega no Brevo. Medido em 21/09/2026: o lead #10 foi
 * gravado as 09:09:49 e a conta do Brevo nao registrou requisicao nenhuma.
 * Quem espera passa `timeoutMs` curto pra limitar o que a visitante aguarda.
 *
 * @param {object} opts
 * @param {string|string[]} opts.to
 * @param {string} [opts.replyTo]
 * @param {string} opts.subject
 * @param {string} opts.htmlContent
 * @param {string} [opts.textContent]
 * @param {number} [opts.timeoutMs=10000]
 */
export async function sendBrevoEmail({ to, replyTo, subject, htmlContent, textContent, timeoutMs = 10_000 }) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.warn('[brevo] BREVO_API_KEY ausente — e-mail nao enviado (no-op).')
    return { ok: true, skipped: true }
  }
  if (!to) {
    console.warn('[brevo] destinatario ausente — e-mail nao enviado.')
    return { ok: true, skipped: true }
  }

  const body = {
    sender: getSender(),
    to: (Array.isArray(to) ? to : [to]).map((email) => ({ email })),
    subject,
    htmlContent,
  }
  if (textContent) body.textContent = textContent
  if (replyTo) body.replyTo = { email: replyTo }

  try {
    const res = await fetch(`${BREVO_API_BASE}/smtp/email`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[brevo] falhou ${res.status}: ${errText}`)
      return { ok: false, status: res.status, error: errText }
    }
    return { ok: true, status: res.status }
  } catch (err) {
    console.error('[brevo] erro:', err?.message || err)
    return { ok: false, error: err?.message || 'desconhecido' }
  }
}

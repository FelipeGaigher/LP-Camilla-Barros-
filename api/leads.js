import { getDb } from './_lib/db.js'
import { ensureAdmin } from './_lib/ensureAdmin.js'
import { requireAuth } from './_lib/auth.js'
import { checkOrigin } from './_lib/origin.js'
import { clientIp, isLeadRateLimited, recordLead } from './_lib/rateLimit.js'
import { sendBrevoEmail } from './_lib/brevo.js'
import { leadNotificationEmail } from './_lib/emailTemplates.js'

/**
 * POST   -> formulario publico do site
 * GET    -> lista pro painel (protegido)
 * DELETE -> apaga um contato por ?id= (protegido)
 */
function clean(v, max = 300) {
  return String(v ?? '').trim().slice(0, max)
}

export default async function handler(req, res) {
  try {
    await ensureAdmin()
    const sql = getDb()

    if (req.method === 'POST') {
      if (!checkOrigin(req)) return res.status(403).json({ ok: false, error: 'Origem nao permitida' })

      const lead = {
        name: clean(req.body?.name, 120),
        phone: clean(req.body?.phone, 40),
        email: clean(req.body?.email, 160),
        message: clean(req.body?.message, 2000),
        interest: clean(req.body?.interest, 120),
        source: clean(req.body?.source, 60) || 'site',
      }

      if (!lead.name || (!lead.phone && !lead.email)) {
        return res.status(400).json({ ok: false, error: 'Informe seu nome e ao menos um contato.' })
      }

      // Honeypot: campo invisivel que so bot preenche. Responde 200 sem gravar,
      // pra ele nao descobrir que foi barrado e tentar outro caminho.
      if (clean(req.body?.website)) return res.status(200).json({ ok: true })

      const ip = clientIp(req)
      if (await isLeadRateLimited(ip)) {
        return res.status(429).json({ ok: false, error: 'Voce ja enviou varias mensagens. Aguarde alguns minutos.' })
      }

      await sql`
        INSERT INTO leads (name, phone, email, message, interest, source)
        VALUES (${lead.name}, ${lead.phone}, ${lead.email}, ${lead.message}, ${lead.interest}, ${lead.source})
      `
      await recordLead(ip)

      // Fire and forget: se o Brevo estiver fora do ar, o lead ja esta salvo e
      // a visitante nao pode ficar esperando o e-mail sair.
      const destino = process.env.CONTACT_EMAIL
      if (destino) {
        const { subject, htmlContent, textContent } = leadNotificationEmail(lead)
        sendBrevoEmail({
          to: destino,
          replyTo: lead.email || undefined,
          subject,
          htmlContent,
          textContent,
        }).catch((err) => console.error('aviso de lead:', err?.message || err))
      }

      return res.status(200).json({ ok: true })
    }

    if (req.method === 'GET' || req.method === 'DELETE') {
      if (req.method === 'DELETE' && !checkOrigin(req)) {
        return res.status(403).json({ error: 'Origem nao permitida' })
      }
      const auth = await requireAuth(req)
      if (!auth.authorized) return res.status(401).json({ error: 'Nao autorizado' })

      if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'no-store, must-revalidate')
        const rows = await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 500`
        return res.status(200).json({ leads: rows })
      }

      const id = Number(req.query?.id)
      if (!id) return res.status(400).json({ error: 'id obrigatorio' })
      await sql`DELETE FROM leads WHERE id = ${id}`
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Metodo nao permitido' })
  } catch (err) {
    console.error('/api/leads:', err)
    return res.status(500).json({ ok: false, error: 'Erro interno' })
  }
}

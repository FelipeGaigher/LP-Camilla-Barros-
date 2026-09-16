import { getDb } from './_lib/db.js'
import { ensureAdmin } from './_lib/ensureAdmin.js'
import { requireAuth } from './_lib/auth.js'
import { checkOrigin } from './_lib/origin.js'
import { clientIp, isLeadRateLimited, recordLead } from './_lib/rateLimit.js'
import { sendBrevoEmail } from './_lib/brevo.js'
import { leadNotificationEmail } from './_lib/emailTemplates.js'
import { normalizaTelefone } from './_lib/telefone.js'

/**
 * POST   -> formulario publico do site
 * GET    -> lista pro painel (protegido)
 * DELETE -> apaga um contato por ?id= (protegido)
 */
function clean(v, max = 300) {
  return String(v ?? '').trim().slice(0, max)
}

/**
 * Liga a mensagem a uma paciente ja cadastrada, quando o telefone bate.
 *
 * Sem isso a mensagem fica invisivel: o funil esconde de proposito o contato
 * cujo telefone ja e de uma paciente, pra nao criar um segundo card da mesma
 * pessoa — e ai a mensagem dela nao aparece em lugar nenhum.
 *
 * Isto NAO escreve em `pacientes`. E so uma ligacao na tabela de contatos, que
 * o endpoint publico ja pode escrever. A tabela de dado de saude continua
 * fechada pra escrita anonima.
 *
 * Fire and forget, e engole erro de proposito: a tabela `pacientes` so existe
 * depois da migration da agenda. Se o deploy chegar antes do migrate, o
 * formulario do site nao pode quebrar por causa disto.
 */
function vincularAPaciente(sql, leadId, chave) {
  if (!leadId || !chave) return
  Promise.resolve()
    .then(() =>
      sql`
        UPDATE leads
           SET paciente_id = (
                 SELECT id FROM pacientes
                  WHERE telefone_key = ${chave} AND ativo
                  LIMIT 1)
         WHERE id = ${leadId}
      `
    )
    .catch((err) => console.error('vincular lead a paciente:', err.message))
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

      // telefone_key normalizado ja na entrada: e por ele que o CRM cruza este
      // contato com paciente e com pedido de horario da mesma pessoa. Calcular
      // so na hora de exibir faria a mesma pessoa virar tres cards no funil.
      const chave = normalizaTelefone(lead.phone)
      const [linha] = await sql`
        INSERT INTO leads (name, phone, telefone_key, email, message, interest, source)
        VALUES (${lead.name}, ${lead.phone}, ${chave},
                ${lead.email}, ${lead.message}, ${lead.interest}, ${lead.source})
        RETURNING id
      `
      await recordLead(ip)
      vincularAPaciente(sql, linha?.id, chave)

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

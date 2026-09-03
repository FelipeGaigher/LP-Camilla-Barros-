import { Router } from 'express'
import { getDb } from '../_lib/db.js'
import { authGuard } from '../_lib/auth.js'

const router = Router()

function clean(v, max = 300) {
  return String(v ?? '').trim().slice(0, max)
}

// POST /api/leads  -> formulario publico do site
router.post('/', async (req, res) => {
  try {
    const name = clean(req.body?.name, 120)
    const phone = clean(req.body?.phone, 40)
    const email = clean(req.body?.email, 160)
    const message = clean(req.body?.message, 2000)
    const interest = clean(req.body?.interest, 120)
    const source = clean(req.body?.source, 60) || 'site'

    if (!name || (!phone && !email)) {
      return res.status(400).json({ ok: false, error: 'Informe seu nome e ao menos um contato.' })
    }
    // honeypot anti-bot
    if (clean(req.body?.website)) return res.status(200).json({ ok: true })

    const sql = getDb()
    await sql`
      INSERT INTO leads (name, phone, email, message, interest, source)
      VALUES (${name}, ${phone}, ${email}, ${message}, ${interest}, ${source})
    `
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('POST /leads', err)
    return res.status(500).json({ ok: false, error: 'Erro interno' })
  }
})

// GET /api/leads  (protegido)
router.get('/', authGuard, async (req, res) => {
  try {
    const sql = getDb()
    const rows = await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 500`
    return res.status(200).json({ leads: rows })
  } catch (err) {
    console.error('GET /leads', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// DELETE /api/leads  (protegido)
router.delete('/', authGuard, async (req, res) => {
  try {
    const id = Number(req.body?.id)
    if (!id) return res.status(400).json({ error: 'id obrigatorio' })
    const sql = getDb()
    await sql`DELETE FROM leads WHERE id = ${id}`
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('DELETE /leads', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

export default router

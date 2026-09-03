import { Router } from 'express'
import { getDb } from '../_lib/db.js'
import { authGuard } from '../_lib/auth.js'
import { logAudit } from '../_lib/auditLog.js'

const router = Router()

// GET /api/sections  -> todas as secoes de uma vez (usado no boot do site)
router.get('/', async (req, res) => {
  try {
    const sql = getDb()
    const rows = await sql`SELECT section_key, data FROM site_sections`
    const result = {}
    for (const row of rows) result[row.section_key] = row.data
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=59')
    return res.status(200).json(result)
  } catch (err) {
    console.error('GET /sections:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// GET /api/sections/:key
router.get('/:key', async (req, res) => {
  try {
    const sql = getDb()
    const rows = await sql`SELECT data FROM site_sections WHERE section_key = ${req.params.key}`
    if (rows.length === 0) return res.status(404).json({ error: 'Nao encontrado' })
    return res.status(200).json(rows[0].data)
  } catch (err) {
    console.error('GET /sections/:key', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// PUT /api/sections/:key  (protegido)
router.put('/:key', authGuard, async (req, res) => {
  const { key } = req.params
  try {
    const sql = getDb()
    const { data } = req.body || {}
    if (data === undefined) return res.status(400).json({ error: 'Corpo invalido' })

    let oldData = null
    try {
      const old = await sql`SELECT data FROM site_sections WHERE section_key = ${key}`
      if (old.length > 0) oldData = old[0].data
    } catch {}

    await sql`
      INSERT INTO site_sections (section_key, data, updated_at)
      VALUES (${key}, ${JSON.stringify(data)}::jsonb, NOW())
      ON CONFLICT (section_key)
      DO UPDATE SET data = ${JSON.stringify(data)}::jsonb, updated_at = NOW()
    `

    logAudit(sql, {
      sectionKey: key,
      action: 'update',
      oldData,
      newData: data,
      userId: req.auth.userId,
      username: req.auth.username,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('PUT /sections/:key', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// DELETE /api/sections/:key  -> volta ao conteudo padrao (protegido)
router.delete('/:key', authGuard, async (req, res) => {
  const { key } = req.params
  try {
    const sql = getDb()
    let oldData = null
    try {
      const old = await sql`SELECT data FROM site_sections WHERE section_key = ${key}`
      if (old.length > 0) oldData = old[0].data
    } catch {}

    await sql`DELETE FROM site_sections WHERE section_key = ${key}`

    logAudit(sql, {
      sectionKey: key,
      action: 'delete',
      oldData,
      newData: null,
      userId: req.auth.userId,
      username: req.auth.username,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('DELETE /sections/:key', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

export default router

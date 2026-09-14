import { getDb } from './_lib/db.js'
import { ensureAdmin } from './_lib/ensureAdmin.js'
import { requireAuth } from './_lib/auth.js'
import { checkOrigin } from './_lib/origin.js'
import { logAudit } from './_lib/auditLog.js'

/**
 * Conteudo do site, uma linha JSONB por secao.
 *
 * GET sem key    -> todas as secoes (boot do site)
 * GET ?key=      -> uma secao
 * PUT ?key=      -> grava (protegido)
 * DELETE ?key=   -> apaga a linha; o site volta ao defaults.js (protegido)
 */
export default async function handler(req, res) {
  try {
    await ensureAdmin()
    const sql = getDb()
    const key = req.query?.key

    if (req.method === 'GET') {
      // Sem cache, de proposito. O s-maxage do edge da Vercel causava o bug do
      // "meu save sumiu": a gravacao persistia, mas o GET seguinte servia copia
      // velha por ate 69s em aba anonima ou hard refresh. O Neon responde em
      // poucos ms, entao o custo de ler direto e irrelevante.
      res.setHeader('Cache-Control', 'no-store, must-revalidate')

      if (!key) {
        const rows = await sql`SELECT section_key, data FROM site_sections`
        const result = {}
        for (const row of rows) result[row.section_key] = row.data
        return res.status(200).json(result)
      }

      const rows = await sql`SELECT data FROM site_sections WHERE section_key = ${key}`
      if (rows.length === 0) return res.status(404).json({ error: 'Nao encontrado' })
      return res.status(200).json(rows[0].data)
    }

    if (req.method === 'PUT' || req.method === 'DELETE') {
      if (!key) return res.status(400).json({ error: 'Parametro key obrigatorio' })
      if (!checkOrigin(req)) return res.status(403).json({ error: 'Origem nao permitida' })

      const auth = await requireAuth(req)
      if (!auth.authorized) return res.status(401).json({ error: 'Nao autorizado' })

      let oldData = null
      try {
        const old = await sql`SELECT data FROM site_sections WHERE section_key = ${key}`
        if (old.length > 0) oldData = old[0].data
      } catch {}

      if (req.method === 'PUT') {
        const { data } = req.body || {}
        if (data === undefined) return res.status(400).json({ error: 'Corpo invalido' })

        // JSON.stringify direto: o Postgres faz o cast text -> jsonb na coluna.
        // O sql.json() do postgres.js nao existe no driver do Neon.
        await sql`
          INSERT INTO site_sections (section_key, data, updated_at)
          VALUES (${key}, ${JSON.stringify(data)}, NOW())
          ON CONFLICT (section_key)
          DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        `

        logAudit(sql, {
          sectionKey: key,
          action: 'update',
          oldData,
          newData: data,
          userId: auth.userId,
          username: auth.username,
        })
        return res.status(200).json({ ok: true })
      }

      await sql`DELETE FROM site_sections WHERE section_key = ${key}`
      logAudit(sql, {
        sectionKey: key,
        action: 'delete',
        oldData,
        newData: null,
        userId: auth.userId,
        username: auth.username,
      })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Metodo nao permitido' })
  } catch (err) {
    console.error('/api/sections:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
}

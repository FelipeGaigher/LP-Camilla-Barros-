import { handleUpload } from '@vercel/blob/client'
import { list, del } from '@vercel/blob'
import { ensureAdmin } from './_lib/ensureAdmin.js'
import { requireAuth } from './_lib/auth.js'
import { checkOrigin } from './_lib/origin.js'

/**
 * Midia no Vercel Blob.
 *
 * O arquivo nunca passa por esta funcao. O navegador pede um token aqui, sobe
 * direto pro Blob e so entao devolve a URL. E isso que permite o video da
 * Camilla: o corpo de uma funcao da Vercel para em 4,5 MB.
 *
 * POST   -> emite o token de upload (protegido)
 * GET    -> lista o que ja foi enviado (protegido)
 * DELETE -> apaga por ?url= (protegido)
 */
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
]

// SVG ficou de fora de proposito: ele carrega script, e um arquivo servido
// como imagem viraria XSS armazenado. Num site de fotos nao faz falta.

const MAX_BYTES = 200 * 1024 * 1024 // 200 MB

export default async function handler(req, res) {
  try {
    await ensureAdmin()

    if (req.method === 'POST') {
      if (!checkOrigin(req)) return res.status(403).json({ error: 'Origem nao permitida' })

      const json = await handleUpload({
        body: req.body,
        request: req,
        onBeforeGenerateToken: async () => {
          const auth = await requireAuth(req)
          if (!auth.authorized) throw new Error('Nao autorizado')
          return {
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_BYTES,
            addRandomSuffix: true,
          }
        },
        // Nao roda em localhost (a Vercel nao alcanca a maquina de dev) e o
        // fluxo nao depende dela: quem recebe a URL final e o proprio navegador.
        onUploadCompleted: async ({ blob }) => {
          console.log('[blob] upload concluido:', blob.pathname)
        },
      })

      return res.status(200).json(json)
    }

    if (req.method === 'GET' || req.method === 'DELETE') {
      if (req.method === 'DELETE' && !checkOrigin(req)) {
        return res.status(403).json({ error: 'Origem nao permitida' })
      }
      const auth = await requireAuth(req)
      if (!auth.authorized) return res.status(401).json({ error: 'Nao autorizado' })

      if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'no-store, must-revalidate')
        const { blobs } = await list({ limit: 200 })
        const files = blobs
          .map((b) => ({
            name: b.pathname,
            url: b.url,
            size: b.size,
            updatedAt: new Date(b.uploadedAt).getTime(),
          }))
          .sort((a, b) => b.updatedAt - a.updatedAt)
        return res.status(200).json({ files })
      }

      const url = String(req.query?.url || '')
      if (!url) return res.status(400).json({ error: 'url obrigatoria' })
      await del(url)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Metodo nao permitido' })
  } catch (err) {
    console.error('/api/media:', err)
    // handleUpload sinaliza falha de autorizacao lancando erro.
    const status = /autorizado/i.test(err?.message || '') ? 401 : 400
    return res.status(status).json({ error: err?.message || 'Falha no upload' })
  }
}

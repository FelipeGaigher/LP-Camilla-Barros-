import { Router } from 'express'
import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { authGuard } from '../_lib/auth.js'

const router = Router()

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'application/pdf': '.pdf',
}

const MAX_BYTES = 200 * 1024 * 1024 // 200 MB (video da Camilla cabe folgado)

function slugify(str) {
  return String(str || 'arquivo')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

/**
 * POST /api/media?name=foto-consultorio.jpg
 * Corpo: binario puro. Content-Type define a extensao.
 * Retorna { url: '/uploads/xxxx.jpg' }
 */
router.post(
  '/',
  authGuard,
  express.raw({ type: Object.keys(ALLOWED), limit: MAX_BYTES }),
  async (req, res) => {
    try {
      const contentType = String(req.headers['content-type'] || '').split(';')[0].trim()
      const ext = ALLOWED[contentType]
      if (!ext) return res.status(415).json({ error: 'Tipo de arquivo nao permitido' })
      if (!req.body?.length) return res.status(400).json({ error: 'Arquivo vazio' })

      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      const base = slugify(String(req.query.name || '').replace(/\.[^.]+$/, ''))
      const filename = `${base || 'arquivo'}-${crypto.randomBytes(6).toString('hex')}${ext}`
      await fs.writeFile(path.join(UPLOAD_DIR, filename), req.body)

      return res.status(200).json({ ok: true, url: `/uploads/${filename}` })
    } catch (err) {
      console.error('POST /media', err)
      return res.status(500).json({ error: 'Falha no upload' })
    }
  }
)

// GET /api/media -> lista os arquivos enviados (protegido)
router.get('/', authGuard, async (req, res) => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const files = await fs.readdir(UPLOAD_DIR)
    const detailed = await Promise.all(
      files.map(async (f) => {
        const stat = await fs.stat(path.join(UPLOAD_DIR, f))
        return { name: f, url: `/uploads/${f}`, size: stat.size, updatedAt: stat.mtimeMs }
      })
    )
    detailed.sort((a, b) => b.updatedAt - a.updatedAt)
    return res.status(200).json({ files: detailed })
  } catch (err) {
    console.error('GET /media', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// DELETE /api/media/:file (protegido)
router.delete('/:file', authGuard, async (req, res) => {
  try {
    const name = path.basename(req.params.file)
    await fs.unlink(path.join(UPLOAD_DIR, name))
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(200).json({ ok: true })
  }
})

export default router

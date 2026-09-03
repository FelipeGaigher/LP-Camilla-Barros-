import 'dotenv/config'
import express from 'express'
import compression from 'compression'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import sectionsRouter from './api/routes/sections.js'
import authRouter from './api/routes/auth.js'
import leadsRouter from './api/routes/leads.js'
import mediaRouter, { UPLOAD_DIR } from './api/routes/media.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(compression())

// Cabecalhos de seguranca basicos (o Nginx pode reforcar depois)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  next()
})

// /api/media usa corpo binario e trata o parse internamente,
// entao entra antes do express.json()
app.use('/api/media', mediaRouter)
app.use(express.json({ limit: '20mb' }))

app.use('/api/sections', sectionsRouter)
app.use('/api/auth', authRouter)
app.use('/api/leads', leadsRouter)

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }))

// Arquivos enviados pelo painel
fs.mkdirSync(UPLOAD_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }))

// Front-end buildado
const DIST = path.join(__dirname, 'dist')
if (fs.existsSync(DIST)) {
  app.use(
    express.static(DIST, {
      maxAge: '1y',
      immutable: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
      },
    })
  )
  // SPA fallback: qualquer rota que nao seja /api cai no index.html
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Arquivo muito grande' })
  }
  console.error(err)
  res.status(500).json({ error: 'Erro interno' })
})

app.listen(PORT, () => {
  console.log(`Camilla Odonto rodando em http://localhost:${PORT}`)
})

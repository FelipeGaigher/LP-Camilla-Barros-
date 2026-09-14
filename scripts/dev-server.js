/**
 * Servidor de desenvolvimento local.
 *
 * Em producao cada arquivo de api/ vira uma funcao serverless da Vercel. Local,
 * este Express varre a mesma pasta e monta as rotas com os mesmos handlers —
 * assim o que roda na sua maquina e literalmente o codigo que vai pro ar, sem
 * depender do `vercel dev`.
 *
 * Uso: node scripts/dev-server.js          (so a API, porta 3000)
 *      node scripts/dev-server.js --full   (API + Vite)
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import express from 'express'
import cors from 'cors'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { readdir, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const API_DIR = join(ROOT_DIR, 'api')
const PORT = 3000

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const routes = new Map()

async function scanRoutes(dir, prefix = '/api') {
  for (const entry of await readdir(dir)) {
    if (entry.startsWith('_')) continue // _lib nao e rota

    const fullPath = join(dir, entry)
    if ((await stat(fullPath)).isDirectory()) {
      await scanRoutes(fullPath, `${prefix}/${entry}`)
      continue
    }
    if (!entry.endsWith('.js')) continue

    const mod = await import(pathToFileURL(fullPath).href)
    if (typeof mod.default !== 'function') continue

    let routePath
    if (entry === 'index.js') routePath = prefix
    else if (entry.startsWith('[') && entry.endsWith('].js')) routePath = `${prefix}/:${entry.slice(1, -4)}`
    else routePath = `${prefix}/${entry.replace('.js', '')}`

    routes.set(routePath, mod.default)
    console.log(`  ${routePath}`)
  }
}

function startVite() {
  const isWin = process.platform === 'win32'
  const vite = spawn(isWin ? 'npx.cmd' : 'npx', ['vite'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: isWin,
  })

  vite.on('error', (err) => console.error('Falha ao subir o Vite:', err.message))
  vite.on('close', (code) => process.exit(code || 0))
  process.on('SIGINT', () => { vite.kill(); process.exit() })
  process.on('SIGTERM', () => { vite.kill(); process.exit() })
}

async function start() {
  if (!process.env.DATABASE_URL) {
    console.warn('\n  Aviso: DATABASE_URL nao esta definida. Copie .env.example para .env.local.\n')
  }

  console.log('\nRotas da API:')
  await scanRoutes(API_DIR)

  for (const [routePath, handler] of routes) {
    app.all(routePath, async (req, res) => {
      try {
        // A Vercel entrega params de rota dinamica dentro de req.query.
        // O Express separa em req.params, entao juntamos pra igualar.
        if (req.params) {
          const merged = { ...req.query, ...req.params }
          Object.defineProperty(req, 'query', { value: merged, writable: true, configurable: true })
        }
        await handler(req, res)
      } catch (err) {
        console.error(`Erro em ${routePath}:`, err)
        if (!res.headersSent) res.status(500).json({ error: 'Erro interno' })
      }
    })
  }

  app.listen(PORT, () => {
    console.log(`\n  API em http://localhost:${PORT}`)
    if (process.argv.includes('--full')) {
      console.log('  Subindo o Vite...\n')
      startVite()
    } else {
      console.log('  O Vite faz proxy de /api pra ca.\n')
    }
  })
}

start().catch((err) => {
  console.error('Falha ao subir o servidor de dev:', err)
  process.exit(1)
})

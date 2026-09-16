// Gera dist/sitemap.xml e dist/robots.txt depois do build.
//
// Uma pagina so, entao o sitemap e quase simbolico — o que importa e o
// robots.txt apontando pra ele e barrando /gestao do indice.

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const DIST = path.resolve('dist')

async function siteUrl() {
  // A URL canonica e editavel pelo painel, entao o banco manda.
  if (process.env.DATABASE_URL) {
    try {
      const { neon } = await import('@neondatabase/serverless')
      const sql = neon(process.env.DATABASE_URL)
      const rows = await sql`SELECT data FROM site_sections WHERE section_key = 'seo'`
      const url = rows[0]?.data?.siteUrl
      if (url) return String(url).replace(/\/$/, '')
    } catch (err) {
      console.warn('sitemap: leitura do banco falhou —', err.message)
    }
  }
  const { defaults } = await import(pathToFileURL(path.resolve('client/src/data/defaults.js')).href)
  return String(process.env.APP_URL || defaults.seo.siteUrl || '').replace(/\/$/, '')
}

async function main() {
  if (!fs.existsSync(DIST)) {
    console.warn('sitemap: dist/ nao existe — rode o `vite build` antes.')
    return
  }

  const base = await siteUrl()
  if (!base) {
    console.warn('sitemap: sem URL do site — pulando.')
    return
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <lastmod>${hoje}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`

  const robots = `User-agent: *
Allow: /
Disallow: /gestao
Disallow: /gestao/

Sitemap: ${base}/sitemap.xml
`

  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap)
  fs.writeFileSync(path.join(DIST, 'robots.txt'), robots)
  console.log(`  ok sitemap.xml e robots.txt (${base})`)
}

main().catch((err) => {
  console.warn('sitemap: falha —', err.message)
})

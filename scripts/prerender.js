// Prerender pos-build: grava o HTML real da home, pra o crawler e o WhatsApp
// nao receberem uma <div id="root"> vazia.
//
// Como funciona:
// 1. Guarda o shell SPA original como dist/app.html — e pra ele que o rewrite
//    do vercel.json manda /admin e qualquer rota nao prerenderizada.
// 2. Le um snapshot de site_sections no Neon. Sem DATABASE_URL, usa o
//    defaults.js do proprio front.
// 3. render(url, sections) do bundle SSR injeta o corpo, e as metas e o JSON-LD
//    saem de client/src/lib/seo.js — a mesma funcao que o SeoHead usa em
//    runtime, entao build e navegador nunca divergem.
// 4. Qualquer falha aqui vira aviso, nunca erro: o build segue e o site cai pra
//    SPA pura, que e exatamente como ele funcionava antes.

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const DIST = path.resolve('dist')
const SSR_ENTRY = path.resolve('dist-ssr/entry-server.js')

const ROUTES = [{ url: '/', out: 'index.html' }]

function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function loadSections() {
  if (!process.env.DATABASE_URL) {
    console.log('prerender: DATABASE_URL ausente — renderizando com os defaults.')
    return null
  }
  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`SELECT section_key, data FROM site_sections`
    if (!rows.length) {
      console.log('prerender: site_sections vazia — renderizando com os defaults.')
      return null
    }
    return Object.fromEntries(rows.map((r) => [r.section_key, r.data]))
  } catch (err) {
    console.warn('prerender: snapshot do banco falhou —', err.message)
    return null
  }
}

async function loadRenderer() {
  if (!fs.existsSync(SSR_ENTRY)) {
    console.warn('prerender: bundle SSR nao encontrado — so as metas serao aplicadas.')
    return null
  }
  try {
    const mod = await import(pathToFileURL(SSR_ENTRY).href)
    return mod.render
  } catch (err) {
    console.warn('prerender: import do bundle SSR falhou —', err.message)
    return null
  }
}

function replaceTag(html, regex, replacement) {
  return regex.test(html) ? html.replace(regex, replacement) : html
}

function applyHead(template, { meta, jsonLd }) {
  let html = template

  if (meta.title) {
    html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${escAttr(meta.title)}</title>`)
    html = replaceTag(
      html,
      /<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${escAttr(meta.title)}" />`
    )
    html = replaceTag(
      html,
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${escAttr(meta.title)}" />`
    )
  }

  if (meta.description) {
    html = replaceTag(
      html,
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escAttr(meta.description)}" />`
    )
    html = replaceTag(
      html,
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${escAttr(meta.description)}" />`
    )
    html = replaceTag(
      html,
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${escAttr(meta.description)}" />`
    )
  }

  if (meta.canonical) {
    html = replaceTag(
      html,
      /<meta property="og:url" content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${escAttr(meta.canonical)}" />`
    )
  }

  if (meta.ogImage) {
    html = replaceTag(
      html,
      /<meta property="og:image" content="[^"]*"\s*\/?>/,
      `<meta property="og:image" content="${escAttr(meta.ogImage)}" />`
    )
  }

  let extra = ''
  if (meta.canonical) extra += `    <link rel="canonical" href="${escAttr(meta.canonical)}" />\n`
  if (meta.themeColor) extra += `    <meta name="theme-color" content="${escAttr(meta.themeColor)}" />\n`
  if (meta.favicon) extra += `    <link rel="icon" href="${escAttr(meta.favicon)}" />\n`
  if (jsonLd) {
    // `<` escapado: um "</script>" dentro de um campo do CMS fecharia a tag
    // aqui e o resto do JSON viraria HTML solto na pagina.
    const safe = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
    extra += `    <script type="application/ld+json" id="ld-json">${safe}</script>\n`
  }

  return extra ? html.replace('</head>', `${extra}  </head>`) : html
}

async function main() {
  const indexPath = path.join(DIST, 'index.html')
  if (!fs.existsSync(indexPath)) {
    console.warn('prerender: dist/index.html nao existe — rode o `vite build` antes.')
    return
  }

  const template = fs.readFileSync(indexPath, 'utf8')

  // Shell SPA intacto: destino do rewrite pras rotas nao prerenderizadas.
  fs.writeFileSync(path.join(DIST, 'app.html'), template)

  const snapshot = await loadSections()

  // As metas saem da mesma funcao que o SeoHead usa em runtime. Sem banco, do
  // defaults.js — e por isso que o import vem depois do snapshot.
  const { defaults } = await import(pathToFileURL(path.resolve('client/src/data/defaults.js')).href)
  const { buildMeta, buildJsonLd } = await import(pathToFileURL(path.resolve('client/src/lib/seo.js')).href)

  const sections = { ...defaults, ...(snapshot || {}) }
  const jsonLd = buildJsonLd(sections)

  const render = await loadRenderer()

  for (const route of ROUTES) {
    // Canonical e por pagina, nao por site: se um dia entrar uma rota nova aqui,
    // repetir a canonical da home nela diria ao Google que as duas sao a mesma
    // coisa, e a nova sairia do indice.
    const meta = buildMeta(sections, route.url)

    // O JSON-LD de Dentist descreve o consultorio, entao so faz sentido na home.
    let html = applyHead(template, { meta, jsonLd: route.url === '/' ? jsonLd : null })

    if (render) {
      try {
        const body = render(route.url, sections)
        html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
      } catch (err) {
        console.warn(`prerender: render de ${route.url} falhou — shell so com as metas.`, err.message)
      }
    }

    const outPath = path.join(DIST, route.out)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, html)
    console.log(`  ok ${route.url} -> dist/${route.out}`)
  }
}

main().catch((err) => {
  // Nunca derruba o build: sem prerender o site funciona como SPA pura.
  console.warn('prerender: falha geral —', err.message)
})

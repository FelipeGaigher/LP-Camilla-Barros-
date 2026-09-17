/**
 * LEVA A COPY DO defaults.js PARA O BANCO
 *
 * Por que existe: `defaults.js` NAO e a fonte da verdade de um site ja
 * semeado. O front le GET /api/sections e o merge do SiteDataContext so cai no
 * default quando o campo vem undefined/null — string vazia gravada no banco
 * vence. E `seed.js` usa ON CONFLICT DO NOTHING, entao rodar o seed de novo
 * nao atualiza nada. Sem este script, editar a copy e dar deploy nao muda uma
 * virgula do site.
 *
 * O que ele faz: para cada secao, mescla o texto novo por cima do JSONB que ja
 * esta no banco, PRESERVANDO o que foi configurado por fora do git — as fotos
 * que subiram pro Vercel Blob, o link do Maps, o numero de WhatsApp, o CRO, a
 * visibilidade e a ordem das secoes.
 *
 * TRAVA CONTRA REVERSAO. O painel e a fonte viva: a Camilla reescreve texto por
 * la a qualquer momento, e ai o arquivo fica velho. Rodar este script sem olhar
 * o diff desfaria o trabalho dela em silencio — aconteceu em 17/09, com o hero
 * e os tratamentos reescritos pelo painel horas depois de o arquivo ser
 * gravado. Entao sobrescrever texto que ja existe no banco exige `--forcar`.
 * Preencher campo que ainda nao existe la continua liberado, porque nao ha o
 * que perder.
 *
 * Uso:
 *   node scripts/atualizar-copy.js --dry-run     ve o diff, nao escreve nada
 *   node scripts/atualizar-copy.js               aplica o que e seguro
 *   node scripts/atualizar-copy.js --forcar      aplica tambem o que sobrescreve
 *   node scripts/atualizar-copy.js --secao=hero  limita a uma secao
 */

import dotenv from 'dotenv'
import { getDb } from '../api/_lib/db.js'
import { defaults } from '../client/src/data/defaults.js'

dotenv.config({ path: '.env.local' })
dotenv.config()

/**
 * Caminhos onde o banco ganha do arquivo. `*` casa com qualquer indice de
 * array. Sao os campos que nao sao copy: midia, coordenada, destino de link e
 * configuracao que a Camilla mexe pelo painel.
 *
 * A preservacao so vale quando o banco tem valor de verdade. Se la estiver
 * vazio, o arquivo entra — assim o script nunca apaga nada nem deixa buraco.
 */
const PRESERVAR = [
  'seo.ogImage',
  'seo.favicon',
  'seo.siteUrl',
  'seo.themeColor',
  'seo.schema.latitude',
  'seo.schema.longitude',
  'seo.schema.priceRange',
  'hero.media.image',
  'hero.media.video',
  'hero.media.poster',
  'hero.ctaPrimary.href',
  'hero.ctaSecondary.href',
  'credenciais.cro',
  'video.videoUrl',
  'video.poster',
  'video.enabled',
  'tratamentos.items.*.image',
  'sobre.image',
  'sobre.cta.href',
  'consultorio.gallery.*.image',
  'consultorio.ctaMaps.href',
  'depoimentos.googleUrl',
  'contato.whatsapp.number',
  'contato.formEnabled',
  'footer.endereco.mapsEmbed',
  'footer.endereco.mapsLink',
  'footer.social.instagram',
  'footer.social.whatsapp',
  'footer.social.facebook',
  'footer.legal.cro',
  'footer.legal.responsavelTecnico',
  'footer.legal.cnpj',
  'footer.credit.href',
  'nav.logoImage',
  'nav.links.*.href',
  'nav.cta.href',
  'nav.cta.label',
  'visibility.order',
  // `settings` e `visibility` inteiros: preferencia da Camilla, nao copy.
  // A unica excecao esta em FORCAR, logo abaixo.
  'settings.*',
  'visibility.*',
]

/**
 * Caminhos onde o arquivo ganha mesmo estando dentro de um bloco preservado.
 * Hoje so um: a secao de depoimentos sai do ar porque os tres depoimentos que
 * estavam publicados eram "[PLACEHOLDER] Depoimento sobre...". Religar so com
 * relato real e autorizacao da paciente.
 */
const FORCAR = ['visibility.depoimentos']

const casa = (caminho, padrao) => {
  const c = caminho.split('.')
  const p = padrao.split('.')
  if (p[p.length - 1] === '*' && p.length <= c.length) {
    // 'settings.*' cobre qualquer coisa abaixo de settings
    return p.slice(0, -1).every((parte, i) => parte === c[i])
  }
  if (c.length !== p.length) return false
  return p.every((parte, i) => parte === '*' || parte === c[i])
}

const preservado = (caminho) =>
  !FORCAR.some((f) => casa(caminho, f)) && PRESERVAR.some((p) => casa(caminho, p))

/** Vazio = nao ha o que preservar. Nunca sobrescreve texto novo com nada. */
const vazio = (v) => v === undefined || v === null || v === ''

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Mescla `novo` (arquivo) sobre `atual` (banco).
 *
 * O arquivo manda no formato: e ele que define quantos itens um array tem.
 * E assim que o FAQ cai de 7 para 4 perguntas e os depoimentos vao a zero,
 * mesmo com sete e tres gravados no banco. Dentro de cada item, porem, o
 * merge continua item a item, para nao levar junto a foto do card.
 */
function mesclar(novo, atual, caminho, mudancas) {
  if (preservado(caminho) && !vazio(atual)) {
    if (JSON.stringify(atual) !== JSON.stringify(novo)) {
      mudancas.push({ caminho, de: novo, para: atual, preservado: true })
    }
    return atual
  }

  if (Array.isArray(novo)) {
    const base = Array.isArray(atual) ? atual : []
    if (novo.length !== base.length) {
      mudancas.push({ caminho: `${caminho}[]`, de: `${base.length} itens`, para: `${novo.length} itens` })
    }
    return novo.map((item, i) => mesclar(item, base[i], `${caminho}.${i}`, mudancas))
  }

  if (ehObjeto(novo)) {
    const base = ehObjeto(atual) ? atual : {}
    const saida = {}
    for (const [chave, valor] of Object.entries(novo)) {
      saida[chave] = mesclar(valor, base[chave], caminho ? `${caminho}.${chave}` : chave, mudancas)
    }
    // Campo que existe so no banco continua existindo: pode ser coisa que a
    // Camilla criou pelo painel e que o arquivo ainda nao conhece.
    for (const [chave, valor] of Object.entries(base)) {
      if (!(chave in saida)) saida[chave] = valor
    }
    return saida
  }

  if (JSON.stringify(atual) !== JSON.stringify(novo)) {
    mudancas.push({ caminho, de: atual, para: novo })
  }
  return novo
}

const corta = (v, n = 88) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  if (s === undefined) return '(ausente)'
  return s.length > n ? `${s.slice(0, n)}...` : s
}

async function run() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const forcar = args.includes('--forcar')
  const filtro = args.find((a) => a.startsWith('--secao='))?.split('=')[1]

  const sql = getDb()
  const chaves = Object.keys(defaults).filter((k) => !filtro || k === filtro)
  if (filtro && !chaves.length) {
    console.error(`Secao "${filtro}" nao existe. Opcoes: ${Object.keys(defaults).join(', ')}`)
    process.exit(1)
  }

  console.log(dryRun ? '\nDRY RUN — nada sera gravado.\n' : '\nAplicando a copy no banco.\n')

  let totalMudancas = 0
  let midiaPreservada = 0
  // Sobrescritas ficam em quarentena ate o fim: se houver alguma e nao vier
  // --forcar, nada e gravado. Melhor nao escrever nada do que escrever metade.
  const sobrescritas = []
  const pendentes = []

  for (const chave of chaves) {
    const linhas = await sql`SELECT data FROM site_sections WHERE section_key = ${chave}`
    const atual = linhas[0]?.data ?? null

    if (atual === null) {
      console.log(`  ${chave}: nao existe no banco — sera inserida inteira`)
      if (!dryRun) {
        await sql`
          INSERT INTO site_sections (section_key, data, updated_at)
          VALUES (${chave}, ${JSON.stringify(defaults[chave])}, NOW())
          ON CONFLICT (section_key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        `
      }
      totalMudancas += 1
      continue
    }

    const mudancas = []
    const resultado = mesclar(defaults[chave], atual, chave, mudancas)

    if (!mudancas.length) {
      console.log(`  ${chave}: sem mudanca`)
      continue
    }

    console.log(`\n  ${chave}`)
    for (const m of mudancas) {
      if (m.preservado) {
        midiaPreservada += 1
        console.log(`    = ${m.caminho}`)
        console.log(`      mantido do banco: ${corta(m.para)}`)
      } else {
        totalMudancas += 1
        // Campo que ainda nao existe no banco e preenchimento, nao sobrescrita.
        const sobrescreve = m.de !== undefined && m.de !== null
        if (sobrescreve) sobrescritas.push(m.caminho)
        console.log(`    ${sobrescreve ? '!' : '+'} ${m.caminho}`)
        console.log(`      de:   ${corta(m.de)}`)
        console.log(`      para: ${corta(m.para)}`)
      }
    }

    pendentes.push({ chave, resultado })
  }

  console.log(`\n${totalMudancas} campo(s) alterado(s), ${midiaPreservada} preservado(s) do banco.`)

  if (sobrescritas.length) {
    console.log(`\n${sobrescritas.length} deles (marcados com !) sobrescrevem texto que ja existe`)
    console.log('no banco. Se esse texto veio do painel, gravar aqui desfaz o que foi')
    console.log('escrito por la. Confira item a item antes de continuar.')
  }

  if (dryRun) {
    console.log('\nNada foi gravado. Rode sem --dry-run para aplicar.\n')
    return
  }

  if (sobrescritas.length && !forcar) {
    console.log('\nABORTADO: nada foi gravado, nem as adicoes seguras.')
    console.log('Para gravar assim mesmo, rode com --forcar.')
    console.log('Para gravar so uma parte, use --secao=<nome>.\n')
    process.exit(1)
  }

  for (const { chave, resultado } of pendentes) {
    await sql`
      UPDATE site_sections
      SET data = ${JSON.stringify(resultado)}, updated_at = NOW()
      WHERE section_key = ${chave}
    `
  }
  console.log('\nGravado. A copy nova ja esta no ar (o GET /api/sections e no-store).\n')
}

run().catch((err) => {
  console.error('Falha ao atualizar a copy:', err)
  process.exit(1)
})

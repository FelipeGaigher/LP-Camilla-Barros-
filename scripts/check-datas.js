/**
 * Guarda da regra de fuso. `npm run check:datas`, e roda antes do build.
 *
 * Existe porque este erro e invisivel no lugar onde se testa: a funcao
 * serverless roda em UTC, a maquina de desenvolvimento roda em UTC-3, entao um
 * `new Date().getHours()` no api/ fica tres horas errado em producao e certo no
 * teste local. Um grep no CI custa quinze linhas e pega isso na hora.
 *
 * O que e proibido: getter e setter de calendario no fuso local, toLocale* e
 * Intl. O que continua liberado: getTime, getUTC*, toISOString, Date.now e
 * Date.UTC — todos independentes de fuso.
 *
 * A conversao mora em api/_lib/brt.js, o unico arquivo isento.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const RAIZ = process.cwd()
const PASTAS = ['api', 'client/src', 'scripts']
const EXTENSOES = new Set(['.js', '.jsx', '.mjs'])

// Onde a conversao pode acontecer, e onde ela e testada.
const ISENTOS = new Set([
  'api/_lib/brt.js',
  'client/src/lib/brt.js',
  'scripts/test-brt.js',
  'scripts/check-datas.js',
])

const PROIBIDOS = [
  [/\.toLocale(String|DateString|TimeString)\s*\(/, 'toLocale* formata no fuso de quem abriu o navegador'],
  [/\bIntl\s*\./, 'Intl resolve fuso por tabela do sistema'],
  [/\.get(Hours|Minutes|Seconds|Day|Date|Month|FullYear)\s*\(/, 'getter de calendario no fuso local'],
  [/\.set(Hours|Minutes|Seconds|Date|Month|FullYear)\s*\(/, 'setter de calendario no fuso local'],
]

const SUGESTAO = 'use os helpers de api/_lib/brt.js (brtParts, brtDateKey, brtLabel, ...)'

function varrer(dir, arquivos = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome.startsWith('.')) continue
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) varrer(caminho, arquivos)
    else if (EXTENSOES.has(nome.slice(nome.lastIndexOf('.')))) arquivos.push(caminho)
  }
  return arquivos
}

const achados = []

for (const pasta of PASTAS) {
  const base = join(RAIZ, pasta)
  let arquivos = []
  try {
    arquivos = varrer(base)
  } catch {
    continue // pasta ausente nao e erro
  }

  for (const caminho of arquivos) {
    const rel = relative(RAIZ, caminho).split(sep).join('/')
    if (ISENTOS.has(rel)) continue

    const linhas = readFileSync(caminho, 'utf8').split('\n')
    linhas.forEach((linha, i) => {
      // Comentario de linha inteira nao conta: o proprio aviso cita o proibido.
      if (linha.trim().startsWith('//') || linha.trim().startsWith('*')) return
      for (const [regex, motivo] of PROIBIDOS) {
        if (regex.test(linha)) {
          achados.push({ arquivo: rel, linha: i + 1, motivo, trecho: linha.trim() })
          break
        }
      }
    })
  }
}

if (achados.length === 0) {
  console.log('check:datas ok — nenhuma conversao de fuso fora do brt.js')
  process.exit(0)
}

console.error(`\ncheck:datas reprovou com ${achados.length} ocorrencia(s):\n`)
for (const a of achados) {
  console.error(`  ${a.arquivo}:${a.linha}  ${a.motivo}`)
  console.error(`    ${a.trecho}`)
}
console.error(`\n${SUGESTAO}`)
console.error('Se a linha for legitima, acrescente o arquivo em ISENTOS neste script.\n')
process.exit(1)

/**
 * Horario de Brasilia, sem Intl e sem biblioteca.
 *
 * O Brasil nao tem mais horario de verao desde 2019, entao America/Sao_Paulo e
 * UTC-3 fixo. Isso reduz a conversao a uma soma de minutos e torna dispensavel
 * qualquer lib de fuso — todas elas chamam Intl.DateTimeFormat com timeZone por
 * baixo, que e justamente o que este projeto nao usa.
 *
 * A REGRA, e ela vale para o projeto inteiro: fora deste arquivo nao existe
 * getHours, getDay, getMonth, getDate, toLocaleString nem Intl. Aqui dentro a
 * conta e sempre a mesma — desloca o instante e le com os getters *UTC*, que
 * sao os unicos que nao dependem do fuso de quem esta rodando.
 *
 * Isso importa mais no servidor que no navegador: a funcao serverless roda em
 * UTC e a maquina de desenvolvimento roda em UTC-3, entao um getHours() no
 * api/ fica tres horas errado em producao e parece certo no teste local.
 *
 * O banco guarda TIMESTAMPTZ (instante absoluto). A API trafega ISO UTC mais o
 * rotulo ja renderizado por aqui. O client so exibe o rotulo — nunca recalcula.
 *
 * Espelhado em client/src/lib/brt.js, que e um re-export deste arquivo.
 */

const MS_POR_MINUTO = 60000
const MINUTOS_POR_DIA = 1440

/** Brasilia e UTC-3 fixo. Negativo porque esta atras de Greenwich. */
export const BRT_OFFSET_MIN = -180

const DIAS_SEMANA = [
  'domingo', 'segunda-feira', 'terca-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sabado',
]
const DIAS_SEMANA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const RE_DATA_KEY = /^(\d{4})-(\d{2})-(\d{2})$/
const RE_HORA_KEY = /^(\d{1,2}):(\d{2})$/

function dois(n) {
  return String(n).padStart(2, '0')
}

function paraDate(valor) {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor
  if (valor === null || valor === undefined || valor === '') return null
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Instante deslocado para que os getters UTC devolvam a hora de parede em BRT.
 * O Date resultante NAO representa o mesmo instante — e um artificio de leitura
 * e nunca deve escapar deste modulo.
 */
function deslocado(valor) {
  const d = paraDate(valor)
  return d === null ? null : new Date(d.getTime() + BRT_OFFSET_MIN * MS_POR_MINUTO)
}

/**
 * Instante -> partes do calendario em Brasilia.
 * @returns {{ano,mes,dia,hora,min,diaSemana,minutosDoDia}|null} mes e 1-12,
 *   diaSemana e 0-6 comecando no domingo (igual ao getUTCDay).
 */
export function brtParts(valor) {
  const d = deslocado(valor)
  if (d === null) return null
  const hora = d.getUTCHours()
  const min = d.getUTCMinutes()
  return {
    ano: d.getUTCFullYear(),
    mes: d.getUTCMonth() + 1,
    dia: d.getUTCDate(),
    hora,
    min,
    diaSemana: d.getUTCDay(),
    minutosDoDia: hora * 60 + min,
  }
}

/**
 * Partes do calendario em Brasilia -> instante.
 * @param {number} minutosDoDia minutos desde 00:00 BRT. Aceita passar de 1440
 *   (vira o dia seguinte) de proposito, o que simplifica o fim de faixa 24:00.
 */
export function brtToInstant(ano, mes, dia, minutosDoDia = 0) {
  return new Date(
    Date.UTC(ano, mes - 1, dia) + (minutosDoDia - BRT_OFFSET_MIN) * MS_POR_MINUTO
  )
}

/** 'YYYY-MM-DD' -> instante do 00:00 BRT daquele dia. */
export function brtDayStart(dataKey) {
  const m = RE_DATA_KEY.exec(String(dataKey ?? ''))
  if (!m) return null
  return brtToInstant(Number(m[1]), Number(m[2]), Number(m[3]), 0)
}

/** 'YYYY-MM-DD' -> instante do 00:00 BRT do dia seguinte (fim exclusivo). */
export function brtDayEnd(dataKey) {
  const inicio = brtDayStart(dataKey)
  return inicio === null ? null : new Date(inicio.getTime() + MINUTOS_POR_DIA * MS_POR_MINUTO)
}

/** Instante -> 'YYYY-MM-DD' em Brasilia. */
export function brtDateKey(valor) {
  const p = brtParts(valor)
  return p === null ? '' : `${p.ano}-${dois(p.mes)}-${dois(p.dia)}`
}

/** Instante -> 'HH:MM' em Brasilia. */
export function brtTime(valor) {
  const p = brtParts(valor)
  return p === null ? '' : `${dois(p.hora)}:${dois(p.min)}`
}

/** Instante -> '12/03/2026'. */
export function brtDataCurta(valor) {
  const p = brtParts(valor)
  return p === null ? '' : `${dois(p.dia)}/${dois(p.mes)}/${p.ano}`
}

/** Instante -> '12/03/2026 as 14:00'. Formato de tabela e de lista. */
export function brtDataHora(valor) {
  const p = brtParts(valor)
  if (p === null) return ''
  return `${dois(p.dia)}/${dois(p.mes)}/${p.ano} as ${dois(p.hora)}:${dois(p.min)}`
}

/**
 * Instante -> rotulo por extenso, que e o que vai para e-mail e para a tela da
 * paciente: 'quinta-feira, 12 de marco, as 14:00'.
 */
export function brtLabel(valor, { comDiaSemana = true, comHora = true } = {}) {
  const p = brtParts(valor)
  if (p === null) return ''
  const partes = []
  if (comDiaSemana) partes.push(DIAS_SEMANA[p.diaSemana])
  partes.push(`${p.dia} de ${MESES[p.mes - 1]}`)
  if (comHora) partes.push(`as ${dois(p.hora)}:${dois(p.min)}`)
  return partes.join(', ')
}

/** Nome do dia da semana a partir do indice 0-6. */
export function nomeDiaSemana(indice, { curto = false } = {}) {
  const lista = curto ? DIAS_SEMANA_CURTO : DIAS_SEMANA
  return lista[indice] ?? ''
}

/** Nome do mes a partir do numero 1-12. */
export function nomeMes(numero) {
  return MESES[numero - 1] ?? ''
}

/** Hoje em Brasilia, como 'YYYY-MM-DD'. */
export function hojeBRT(agora = new Date()) {
  return brtDateKey(agora)
}

/**
 * Soma dias a uma dataKey, no calendario de Brasilia.
 * Somar 24h em milissegundos e seguro aqui exatamente porque o offset e fixo.
 */
export function somaDias(dataKey, n) {
  const base = brtDayStart(dataKey)
  if (base === null) return ''
  return brtDateKey(new Date(base.getTime() + n * MINUTOS_POR_DIA * MS_POR_MINUTO))
}

/** Diferenca em dias inteiros entre duas dataKeys (b - a). */
export function diffDias(a, b) {
  const ia = brtDayStart(a)
  const ib = brtDayStart(b)
  if (ia === null || ib === null) return 0
  return Math.round((ib.getTime() - ia.getTime()) / (MINUTOS_POR_DIA * MS_POR_MINUTO))
}

/** 'HH:MM' -> minutos desde a meia-noite. Devolve null se a forma nao bater. */
export function horaParaMinutos(horaKey) {
  const m = RE_HORA_KEY.exec(String(horaKey ?? '').trim())
  if (!m) return null
  const hora = Number(m[1])
  const min = Number(m[2])
  if (hora > 24 || min > 59) return null
  return hora * 60 + min
}

/** Minutos desde a meia-noite -> 'HH:MM'. */
export function minutosParaHora(minutos) {
  const total = Number(minutos)
  if (!Number.isFinite(total) || total < 0) return ''
  return `${dois(Math.floor(total / 60))}:${dois(total % 60)}`
}

/** Duas datas caem no mesmo dia de Brasilia? */
export function mesmoDiaBRT(a, b) {
  const ka = brtDateKey(a)
  return ka !== '' && ka === brtDateKey(b)
}

/**
 * Matriz 6x7 de dataKeys cobrindo o mes, com as sobras do mes vizinho.
 * Serve tanto o calendario do painel quanto o seletor de dia do site.
 * A semana comeca no domingo, para casar com o indice de brtParts().diaSemana.
 */
export function matrizDoMes(ano, mes) {
  const primeiro = brtToInstant(ano, mes, 1, 0)
  const deslocamento = brtParts(primeiro).diaSemana
  const inicio = new Date(primeiro.getTime() - deslocamento * MINUTOS_POR_DIA * MS_POR_MINUTO)

  const semanas = []
  for (let semana = 0; semana < 6; semana += 1) {
    const linha = []
    for (let dia = 0; dia < 7; dia += 1) {
      const passo = semana * 7 + dia
      linha.push(brtDateKey(new Date(inicio.getTime() + passo * MINUTOS_POR_DIA * MS_POR_MINUTO)))
    }
    semanas.push(linha)
  }
  return semanas
}

/**
 * Dois intervalos se sobrepoem? Semantica [inicio, fim), a mesma do tstzrange
 * '[)' usado na constraint do banco — encostar nao e sobrepor.
 */
export function sobrepoe(aInicio, aFim, bInicio, bFim) {
  return aInicio.getTime() < bFim.getTime() && aFim.getTime() > bInicio.getTime()
}

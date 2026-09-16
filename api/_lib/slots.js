import { getDb } from './db.js'
import {
  brtDateKey, brtDayStart, brtLabel, brtParts, brtTime, brtToInstant,
  diffDias, hojeBRT, somaDias, sobrepoe,
} from './brt.js'

/**
 * Geracao de horarios livres.
 *
 * A conta pura (montarJanela, slotsDoDia) fica separada do acesso ao banco de
 * proposito: e ela que erra em silencio, e assim da pra testar sem subir nada.
 *
 * Tudo aqui trabalha com instantes. A parede de Brasilia so aparece quando a
 * faixa de atendimento — que e "08:00", uma hora de parede — vira instante, e
 * de novo na hora de montar o rotulo que a paciente le.
 */

const MS_POR_MINUTO = 60000
const SPAN_MAXIMO_DIAS = 31

// ---------------------------------------------------------------- conta pura

/**
 * Recorta o intervalo pedido para o que a agenda aceita responder.
 *
 * Precisa existir porque este endpoint e publico e sem autenticacao: sem o
 * teto, um `de=2026-01-01&ate=2099-12-31` faria o servidor gerar milhoes de
 * slots antes de responder.
 */
export function montarJanela(config, { de, ate }, agora = new Date()) {
  const hoje = hojeBRT(agora)
  const ultimo = somaDias(hoje, Number(config.janela_dias) || 45)

  let inicio = de && de > hoje ? de : hoje
  let fim = ate && ate < ultimo ? ate : ultimo

  if (diffDias(inicio, fim) < 0) fim = inicio
  if (diffDias(inicio, fim) > SPAN_MAXIMO_DIAS) fim = somaDias(inicio, SPAN_MAXIMO_DIAS)

  return { de: inicio, ate: fim }
}

/** Lista de dataKeys de `de` ate `ate`, inclusive nas duas pontas. */
export function diasDaJanela({ de, ate }) {
  const total = diffDias(de, ate)
  if (total < 0) return []
  const dias = []
  for (let i = 0; i <= total; i += 1) dias.push(somaDias(de, i))
  return dias
}

/**
 * Horarios livres de um dia.
 *
 * @param {string} dataKey 'YYYY-MM-DD' em Brasilia
 * @param {Array} faixas linhas de agenda_horarios (minutos desde a meia-noite)
 * @param {Array} ocupados [{ inicio: Date, fim: Date }] — agendamentos que
 *   prendem a cadeira. O buffer da config e aplicado dos dois lados de cada um.
 * @param {Array} bloqueios [{ inicio: Date, fim: Date }] — feriado, ferias, almoco
 * @returns {Array<{inicio: Date, fim: Date}>}
 */
export function slotsDoDia({
  dataKey, faixas, config, duracaoMin, ocupados = [], bloqueios = [], agora = new Date(),
}) {
  const base = brtDayStart(dataKey)
  if (base === null) return []

  const partes = brtParts(base)
  const doDia = faixas.filter((f) => Number(f.dia_semana) === partes.diaSemana && f.ativo !== false)
  if (doDia.length === 0) return []

  const grade = Math.max(5, Number(config.grade_min) || 30)
  const buffer = Math.max(0, Number(config.buffer_min) || 0) * MS_POR_MINUTO
  const duracao = Math.max(5, Number(duracaoMin) || grade)

  // Antecedencia minima: nao adianta oferecer um horario daqui a dez minutos.
  const cedoDemais = agora.getTime() + (Number(config.antecedencia_horas) || 0) * 60 * MS_POR_MINUTO

  const vistos = new Set()
  const livres = []

  for (const faixa of doDia) {
    const abre = Number(faixa.abre_min)
    const fecha = Number(faixa.fecha_min)

    for (let t = abre; t + duracao <= fecha; t += grade) {
      const inicio = brtToInstant(partes.ano, partes.mes, partes.dia, t)
      const chave = inicio.getTime()
      // Faixas podem se sobrepor na configuracao; o mesmo horario nao pode
      // aparecer duas vezes pra paciente.
      if (vistos.has(chave)) continue

      if (chave < cedoDemais) continue

      const fim = new Date(chave + duracao * MS_POR_MINUTO)

      const colide =
        ocupados.some((o) =>
          sobrepoe(inicio, fim, new Date(o.inicio.getTime() - buffer), new Date(o.fim.getTime() + buffer))
        ) || bloqueios.some((b) => sobrepoe(inicio, fim, b.inicio, b.fim))

      if (colide) continue

      vistos.add(chave)
      livres.push({ inicio, fim })
    }
  }

  return livres.sort((a, b) => a.inicio - b.inicio)
}

/**
 * Formato que vai para a API. O rotulo ja sai pronto daqui: o client exibe e
 * devolve o `inicio` literalmente, sem nunca recalcular fuso.
 */
export function formatarSlot({ inicio, fim }) {
  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    dia: brtDateKey(inicio),
    hora: brtTime(inicio),
    rotulo: brtLabel(inicio),
  }
}

// -------------------------------------------------------------- acesso ao db

/**
 * Pendente vencido nao pode ser ignorado, precisa ser varrido: NOW() nao entra
 * no predicado de uma constraint (tem que ser imutavel), entao enquanto a linha
 * estiver como 'pendente' ela continua prendendo o horario de verdade.
 *
 * Roda no comeco de toda leitura e de todo pedido. E o cron que este projeto
 * nao tem.
 */
export async function varrerVencidos(sql) {
  await sql`
    UPDATE agendamentos
       SET status = 'expirado', atualizado_em = NOW()
     WHERE status = 'pendente' AND expira_em IS NOT NULL AND expira_em < NOW()
  `
}

/** Configuracao, grade e procedimentos ativos, numa ida so. */
export async function carregarConfig(sql) {
  const [config, faixas, procedimentos] = await sql.transaction(
    [
      sql`SELECT * FROM agenda_config WHERE id = 1`,
      sql`SELECT dia_semana, abre_min, fecha_min, ativo FROM agenda_horarios WHERE ativo ORDER BY dia_semana, abre_min`,
      sql`SELECT id, nome, duracao_min, publico, ordem FROM agenda_procedimentos WHERE ativo ORDER BY ordem, nome`,
    ],
    { readOnly: true }
  )
  return { config: config[0] || null, faixas, procedimentos }
}

/**
 * Bloqueios e horarios ocupados que tocam a janela.
 *
 * O SELECT de ocupados traz SO inicio e fim. Nada de nome, telefone ou
 * solicitante_*: este dado alimenta um endpoint publico, e um `SELECT *` aqui
 * seria o vazamento mais facil da feature inteira.
 */
export async function carregarOcupacao(sql, de, ate) {
  const [ocupados, bloqueios] = await sql.transaction(
    [
      sql`
        SELECT inicio, fim FROM agendamentos
        WHERE status IN ('pendente','confirmado','realizado')
          AND inicio < ${ate.toISOString()} AND fim > ${de.toISOString()}
      `,
      sql`
        SELECT inicio, fim FROM agenda_bloqueios
        WHERE inicio < ${ate.toISOString()} AND fim > ${de.toISOString()}
      `,
    ],
    { readOnly: true }
  )
  const paraData = (linhas) =>
    linhas.map((l) => ({ inicio: new Date(l.inicio), fim: new Date(l.fim) }))

  return { ocupados: paraData(ocupados), bloqueios: paraData(bloqueios) }
}

/**
 * Quantos horarios livres cada dia da janela tem.
 * Resposta leve de proposito: alimenta o calendario sem trafegar a lista toda.
 */
export async function contarPorDia(sql, { de, ate, duracaoMin, config, faixas, agora = new Date() }) {
  const janela = montarJanela(config, { de, ate }, agora)
  const dias = diasDaJanela(janela)
  if (dias.length === 0) return { janela, dias: [] }

  const inicioJanela = brtDayStart(dias[0])
  const fimJanela = brtDayStart(somaDias(dias[dias.length - 1], 1))
  const { ocupados, bloqueios } = await carregarOcupacao(sql, inicioJanela, fimJanela)

  const resultado = dias.map((dataKey) => ({
    dia: dataKey,
    livres: slotsDoDia({ dataKey, faixas, config, duracaoMin, ocupados, bloqueios, agora }).length,
  }))

  return { janela, dias: resultado }
}

/** Lista completa dos horarios livres de um dia. */
export async function listarDoDia(sql, { dia, duracaoMin, config, faixas, agora = new Date() }) {
  const inicio = brtDayStart(dia)
  if (inicio === null) return []
  const fim = brtDayStart(somaDias(dia, 1))

  const { ocupados, bloqueios } = await carregarOcupacao(sql, inicio, fim)
  return slotsDoDia({ dataKey: dia, faixas, config, duracaoMin, ocupados, bloqueios, agora })
    .map(formatarSlot)
}

/**
 * O horario pedido e mesmo um slot legal?
 *
 * Revalidacao obrigatoria no POST: o client so pode mandar o que viu, mas nada
 * garante que foi isso que ele mandou. A constraint do banco impede o horario
 * ocupado; ela nao impede agendar as 3 da manha de domingo.
 *
 * @returns {{ok: true, fim: Date} | {ok: false, motivo: string}}
 */
export function validarInicio({ inicio, duracaoMin, config, faixas, agora = new Date() }) {
  if (!(inicio instanceof Date) || Number.isNaN(inicio.getTime())) {
    return { ok: false, motivo: 'Horario invalido.' }
  }

  const janela = montarJanela(config, {}, agora)
  const dia = brtDateKey(inicio)
  if (dia < janela.de || dia > janela.ate) {
    return { ok: false, motivo: 'Esse horario esta fora do periodo aberto para agendamento.' }
  }

  const partes = brtParts(inicio)
  const grade = Math.max(5, Number(config.grade_min) || 30)
  const duracao = Math.max(5, Number(duracaoMin) || grade)

  const naFaixa = faixas.some((f) => {
    if (Number(f.dia_semana) !== partes.diaSemana || f.ativo === false) return false
    const abre = Number(f.abre_min)
    if (partes.minutosDoDia < abre) return false
    if (partes.minutosDoDia + duracao > Number(f.fecha_min)) return false
    // Tem que cair exatamente na grade contada a partir da abertura da faixa.
    return (partes.minutosDoDia - abre) % grade === 0
  })
  if (!naFaixa) return { ok: false, motivo: 'Esse horario nao esta no atendimento.' }

  const cedoDemais = agora.getTime() + (Number(config.antecedencia_horas) || 0) * 60 * MS_POR_MINUTO
  if (inicio.getTime() < cedoDemais) {
    return { ok: false, motivo: 'Esse horario esta proximo demais. Escolha outro ou fale pelo WhatsApp.' }
  }

  return { ok: true, fim: new Date(inicio.getTime() + duracao * MS_POR_MINUTO) }
}

/** Atalho para quem so tem o sql e quer a configuracao pronta. */
export async function contexto(sql = getDb()) {
  await varrerVencidos(sql)
  return carregarConfig(sql)
}

/**
 * Estagios do funil — as colunas do kanban.
 *
 * Fonte unica: o CHECK do banco, a validacao da API e os titulos das colunas no
 * painel saem todos daqui. Estagio e o tipo de coisa que alguem acrescenta no
 * front e esquece no banco, e ai o card some sem erro nenhum.
 *
 * `alertaDias` e o que faz o kanban valer a pena. Um quadro que so mostra onde
 * cada pessoa esta e um relatorio; o que muda a rotina e ele apontar quem esta
 * parado tempo demais. Zero desliga o alerta — em tratamento e manutencao o
 * ritmo e clinico, nao comercial, e cobrar ali seria ruido.
 */

export const ESTAGIOS = [
  {
    id: 'contato',
    label: 'Contato novo',
    alertaDias: 2,
    ajuda: 'Pediu informacao ou horario e ainda nao foi respondida.',
  },
  {
    id: 'avaliacao',
    label: 'Avaliacao',
    alertaDias: 7,
    ajuda: 'Tem avaliacao marcada ou ja avaliada, sem plano definido.',
  },
  {
    id: 'orcamento',
    label: 'Orcamento',
    alertaDias: 5,
    ajuda: 'Recebeu a proposta e ainda nao respondeu.',
  },
  {
    id: 'tratamento',
    label: 'Em tratamento',
    alertaDias: 45,
    ajuda: 'Tratamento em andamento.',
  },
  {
    id: 'manutencao',
    label: 'Manutencao',
    alertaDias: 0,
    ajuda: 'Tratamento concluido, acompanhando de tempos em tempos.',
  },
  {
    id: 'inativa',
    label: 'Inativa',
    alertaDias: 0,
    ajuda: 'Sem contato ha muito tempo ou desistiu.',
  },
]

export const IDS_ESTAGIOS = ESTAGIOS.map((e) => e.id)

/** Onde uma pessoa nova entra quando ainda nao e paciente. */
export const ESTAGIO_INICIAL = 'contato'

/** Para onde vai quem teve um horario confirmado: ela ja tem avaliacao marcada. */
export const ESTAGIO_AO_CONFIRMAR = 'avaliacao'

export function ehEstagioValido(id) {
  return IDS_ESTAGIOS.includes(id)
}

export function estagio(id) {
  return ESTAGIOS.find((e) => e.id === id) || null
}

/**
 * Faz tempo demais que o card nao anda?
 * @param {string} id estagio atual
 * @param {Date|string} desde quando entrou no estagio
 */
export function estaParado(id, desde, agora = new Date()) {
  const e = estagio(id)
  if (!e || !e.alertaDias) return false
  const quando = desde instanceof Date ? desde : new Date(desde)
  if (Number.isNaN(quando.getTime())) return false
  const dias = (agora.getTime() - quando.getTime()) / 86400000
  return dias >= e.alertaDias
}

/** Dias inteiros desde uma data, para o rotulo "ha 5 dias". */
export function diasDesde(quando, agora = new Date()) {
  const d = quando instanceof Date ? quando : new Date(quando)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((agora.getTime() - d.getTime()) / 86400000)
}

/** 'ha 5 dias', 'ontem', 'hoje', 'ha 3 meses' — sem Intl, sem lib. */
export function tempoRelativo(quando, agora = new Date()) {
  const dias = diasDesde(quando, agora)
  if (dias === null) return ''
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `ha ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses === 1) return 'ha 1 mes'
  if (meses < 12) return `ha ${meses} meses`
  const anos = Math.floor(meses / 12)
  return anos === 1 ? 'ha 1 ano' : `ha ${anos} anos`
}

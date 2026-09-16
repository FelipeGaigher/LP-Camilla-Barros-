import { getDb } from './db.js'

const MAX_ATTEMPTS = 6
const WINDOW_MINUTES = 15

// Leads usam a mesma tabela, marcados por este username reservado.
// Nao vale a pena uma tabela so pra isso — a janela de contagem e a mesma.
const LEAD_MARKER = '__lead__'
const LEAD_MAX = 5
const LEAD_WINDOW_MINUTES = 10

// Pedido de agendamento pelo site. Limite mais apertado que o do lead: agendar
// e mais raro que mandar mensagem, e um pedido aceito prende um horario de
// verdade, enquanto um lead so grava uma linha.
const AGENDA_MARKER = '__agenda__'
const AGENDA_MAX = 3
const AGENDA_WINDOW_MINUTES = 60

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return String(fwd).split(',')[0].trim()
  return req.socket?.remoteAddress || 'desconhecido'
}

export async function isRateLimited(ip) {
  const sql = getDb()
  const rows = await sql`
    SELECT COUNT(*)::int AS total
    FROM login_attempts
    WHERE ip_address = ${ip}
      -- Nao conta os marcadores reservados (__lead__, __agenda__). LEFT() em
      -- vez de LIKE de proposito: '\_\_%' num template literal do JS perde a
      -- barra e vira '__%', que casa com quase todo username e desligaria o
      -- limite de login sem ninguem perceber.
      AND LEFT(username, 2) <> '__'
      AND success = FALSE
      AND attempted_at > NOW() - ${WINDOW_MINUTES + ' minutes'}::interval
  `
  return (rows[0]?.total || 0) >= MAX_ATTEMPTS
}

export async function recordAttempt(ip, username, success) {
  const sql = getDb()
  await sql`
    INSERT INTO login_attempts (ip_address, username, success)
    VALUES (${ip}, ${username || ''}, ${!!success})
  `
}

/**
 * Trava de envio do formulario publico.
 *
 * Antes o honeypot era a unica barreira. Agora cada lead dispara um e-mail,
 * entao um flood custa reputacao de remetente, nao so linha no banco.
 */
export async function isLeadRateLimited(ip) {
  const sql = getDb()
  const rows = await sql`
    SELECT COUNT(*)::int AS total
    FROM login_attempts
    WHERE ip_address = ${ip}
      AND username = ${LEAD_MARKER}
      AND attempted_at > NOW() - ${LEAD_WINDOW_MINUTES + ' minutes'}::interval
  `
  return (rows[0]?.total || 0) >= LEAD_MAX
}

export async function recordLead(ip) {
  const sql = getDb()
  await sql`
    INSERT INTO login_attempts (ip_address, username, success)
    VALUES (${ip}, ${LEAD_MARKER}, TRUE)
  `
}

/** Trava por IP do pedido de agendamento publico. */
export async function isAgendaRateLimited(ip) {
  const sql = getDb()
  const rows = await sql`
    SELECT COUNT(*)::int AS total
    FROM login_attempts
    WHERE ip_address = ${ip}
      AND username = ${AGENDA_MARKER}
      AND attempted_at > NOW() - ${AGENDA_WINDOW_MINUTES + ' minutes'}::interval
  `
  return (rows[0]?.total || 0) >= AGENDA_MAX
}

export async function recordAgenda(ip) {
  const sql = getDb()
  await sql`
    INSERT INTO login_attempts (ip_address, username, success)
    VALUES (${ip}, ${AGENDA_MARKER}, TRUE)
  `
}

/**
 * Trava por telefone — e esta que sustenta o limite de verdade.
 *
 * IP se troca de graca trocando de rede, e o flood que machuca nem costuma ser
 * de bot: e a pessoa que pede quatro horarios pra decidir depois. Como pendente
 * prende o slot, cada pedido solto tira um horario real da vitrine.
 *
 * Conta em cima da propria tabela de agendamentos, que ja tem indice por
 * solicitante_tel_key. Guardar telefone em login_attempts seria dado pessoal
 * numa tabela onde ninguem vai procurar no dia de apagar.
 *
 * @returns {Promise<{bloqueado: boolean, motivo: string|null}>}
 */
export async function limitePorTelefone(telKey, { maxPendentes = 2, maxDia = 3 } = {}) {
  if (!telKey) return { bloqueado: false, motivo: null }
  const sql = getDb()
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pendente')::int AS pendentes,
      COUNT(*) FILTER (WHERE criado_em > NOW() - INTERVAL '24 hours')::int AS ultimas24h
    FROM agendamentos
    WHERE solicitante_tel_key = ${telKey}
  `
  const { pendentes = 0, ultimas24h = 0 } = rows[0] || {}

  if (pendentes >= maxPendentes) {
    return {
      bloqueado: true,
      motivo: 'Voce ja tem pedidos aguardando confirmacao. Aguarde o retorno da Camilla.',
    }
  }
  if (ultimas24h >= maxDia) {
    return {
      bloqueado: true,
      motivo: 'Voce ja fez varios pedidos hoje. Tente novamente amanha ou fale pelo WhatsApp.',
    }
  }
  return { bloqueado: false, motivo: null }
}

/**
 * Teto de pendentes por dia. Limita o estrago de "congelar a semana inteira" a
 * um numero conhecido, independente de quantos IPs e telefones o atacante tenha.
 */
export async function pendentesNoDia(inicioDoDia, fimDoDia) {
  const sql = getDb()
  const rows = await sql`
    SELECT COUNT(*)::int AS total
    FROM agendamentos
    WHERE status = 'pendente'
      AND inicio >= ${inicioDoDia.toISOString()}
      AND inicio <  ${fimDoDia.toISOString()}
  `
  return rows[0]?.total || 0
}

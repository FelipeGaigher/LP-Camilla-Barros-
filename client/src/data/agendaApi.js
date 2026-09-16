/**
 * Chamadas da agenda e do CRM.
 *
 * Arquivo separado do api.js de proposito. La o padrao e engolir a falha e
 * devolver valor neutro (`catch { return [] }`), o que e uma degradacao
 * aceitavel pra conteudo do site: se a lista de depoimentos nao carregar, a
 * secao some e pronto.
 *
 * Aqui nao serve. "A internet caiu" e "esse horario acabou de ser reservado"
 * precisam ser coisas diferentes na tela — a primeira pede tentar de novo, a
 * segunda pede escolher outro horario. Entao toda funcao daqui devolve
 * { ok, code, data, error }, e o `code` e o que a interface ramifica.
 */

const CREDENCIAIS = { credentials: 'same-origin' }
const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function req(url, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(url, {
      ...CREDENCIAIS,
      method,
      headers: body ? JSON_HEADERS : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    return { ok: false, status: 0, code: 'REDE', error: 'Sem conexao com o servidor.' }
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    /* resposta sem corpo: o status ainda vale */
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      data,
      code: data?.code || String(res.status),
      error: data?.error || 'Nao foi possivel completar a acao.',
    }
  }
  return { ok: true, status: res.status, data }
}

const qs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

// ------------------------------------------------------------------ publico

export function buscarDias({ de, ate, procedimentoId } = {}) {
  return req(`/api/agenda?${qs({ action: 'dias', de, ate, procedimentoId })}`)
}

export function buscarSlots({ dia, procedimentoId } = {}) {
  return req(`/api/agenda?${qs({ action: 'slots', dia, procedimentoId })}`)
}

export function buscarProcedimentos() {
  return req('/api/agenda?action=procedimentos')
}

export function solicitarHorario(payload) {
  return req('/api/agenda?action=solicitar', { method: 'POST', body: payload })
}

// ------------------------------------------------------------------- agenda

export function listarAgenda({ de, ate }) {
  return req(`/api/agenda?${qs({ action: 'listar', de, ate })}`)
}

export function listarPendentes() {
  return req('/api/agenda?action=pendentes')
}

export function criarAgendamento(payload) {
  return req('/api/agenda?action=criar', { method: 'POST', body: payload })
}

export function confirmarAgendamento(id, pacienteId) {
  return req('/api/agenda?action=confirmar', { method: 'POST', body: { id, pacienteId } })
}

export function mudarStatusAgendamento(id, status, motivo) {
  return req('/api/agenda?action=status', { method: 'POST', body: { id, status, motivo } })
}

export function registrarAtendimento(payload) {
  return req('/api/agenda?action=atendimento', { method: 'POST', body: payload })
}

export function buscarConfigAgenda() {
  return req('/api/agenda?action=config')
}

export function salvarConfigAgenda(config) {
  return req('/api/agenda?action=config', { method: 'PUT', body: config })
}

export function salvarHorarios(faixas) {
  return req('/api/agenda?action=horarios', { method: 'PUT', body: { faixas } })
}

export function listarBloqueios() {
  return req('/api/agenda?action=bloqueios')
}

export function criarBloqueio(payload) {
  return req('/api/agenda?action=bloqueios', { method: 'POST', body: payload })
}

export function apagarBloqueio(id) {
  return req(`/api/agenda?action=bloqueios&id=${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------- crm

export function buscarFunil() {
  return req('/api/crm?action=kanban')
}

export function moverCard({ tipo, id, estagio, ordem }) {
  return req('/api/crm?action=mover', { method: 'POST', body: { tipo, id, estagio, ordem } })
}

export function arquivarCard({ tipo, id }) {
  return req('/api/crm?action=arquivar', { method: 'POST', body: { tipo, id } })
}

export function listarPacientes(q) {
  return req(`/api/crm?${qs({ action: 'pacientes', q })}`)
}

export function buscarFicha(id) {
  return req(`/api/crm?action=ficha&id=${id}`)
}

export function salvarPaciente(payload) {
  return req('/api/crm?action=salvar', { method: 'POST', body: payload })
}

export function exportarPaciente(id) {
  return req(`/api/crm?action=exportar&id=${id}`)
}

export function apagarPaciente(id) {
  return req(`/api/crm?action=apagar&id=${id}`, { method: 'DELETE' })
}

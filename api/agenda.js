import { getDb } from './_lib/db.js'
import { ensureAgenda, AgendaNaoInstalada } from './_lib/ensureAgenda.js'
import { requireAuth } from './_lib/auth.js'
import { checkOrigin } from './_lib/origin.js'
import {
  clientIp, isAgendaRateLimited, recordAgenda, limitePorTelefone, pendentesNoDia,
} from './_lib/rateLimit.js'
import { normalizaTelefone } from './_lib/telefone.js'
import { sendBrevoEmail } from './_lib/brevo.js'
import { novaSolicitacaoEmail } from './_lib/emailTemplates.js'
import { logAcesso } from './_lib/acessoLog.js'
import { brtDayStart, brtDateKey, brtLabel, somaDias } from './_lib/brt.js'
import {
  carregarConfig, contarPorDia, listarDoDia, validarInicio, varrerVencidos,
} from './_lib/slots.js'
import {
  criarPedido, confirmarPedido, mudarStatus, criarPeloPainel, registrarAtendimento,
  resumoPublico,
} from './_lib/agendaOps.js'

/**
 * Agenda: vitrine publica de horarios e operacao do painel.
 *
 * Um arquivo so por causa do teto de 12 funcoes serverless do plano Hobby, no
 * mesmo padrao de ?action= que o api/auth.js ja usa.
 *
 * O guard e allow-list, nao deny-list: acao que ninguem lembrou de classificar
 * nasce privada. O contrario falha aberto, e falhar aberto aqui significa expor
 * lista de pacientes.
 */

const ACOES_PUBLICAS = new Set(['dias', 'slots', 'procedimentos', 'solicitar'])

// Publicas, mas que devolvem mais quando quem pergunta esta logada. Lista
// propria e curta de proposito: qualquer acao aqui precisa ter sido pensada
// pros dois casos, e o padrao continua sendo a resposta publica.
const ACOES_COM_SESSAO_OPCIONAL = new Set(['procedimentos'])

function clean(v, max = 300) {
  return String(v ?? '').trim().slice(0, max)
}

function erro(res, status, code, mensagem) {
  return res.status(status).json({ ok: false, code, error: mensagem })
}

export default async function handler(req, res) {
  const action = clean(req.query?.action, 40) || 'dias'

  try {
    await ensureAgenda()
    const sql = getDb()

    // Toda mutacao passa por checkOrigin, inclusive a publica.
    if (req.method !== 'GET' && !checkOrigin(req)) {
      return erro(res, 403, 'ORIGEM_NAO_PERMITIDA', 'Origem nao permitida.')
    }

    let auth = null
    if (!ACOES_PUBLICAS.has(action)) {
      auth = await requireAuth(req)
      if (!auth.authorized) return erro(res, 401, 'NAO_AUTORIZADO', 'Nao autorizado.')
    } else if (ACOES_COM_SESSAO_OPCIONAL.has(action)) {
      // Acao publica que responde MAIS pra quem esta logada. Nao afrouxa o
      // guard: sem sessao a resposta continua sendo a versao publica. O painel
      // precisa disso pra enxergar retorno e urgencia, que nao vao pro site.
      const tentativa = await requireAuth(req)
      if (tentativa.authorized) auth = tentativa
    }

    // Nada da agenda pode ser cacheado no edge: horario livre muda a cada
    // pedido, e o painel nao pode ver uma agenda de cinco minutos atras.
    res.setHeader('Cache-Control', 'no-store, must-revalidate')

    switch (action) {
      case 'dias': return await acaoDias(sql, req, res)
      case 'slots': return await acaoSlots(sql, req, res)
      case 'procedimentos': return await acaoProcedimentos(sql, req, res, auth)
      case 'solicitar': return await acaoSolicitar(sql, req, res)
      case 'listar': return await acaoListar(sql, req, res, auth)
      case 'pendentes': return await acaoPendentes(sql, req, res, auth)
      case 'criar': return await acaoCriar(sql, req, res, auth)
      case 'confirmar': return await acaoConfirmar(sql, req, res, auth)
      case 'status': return await acaoStatus(sql, req, res, auth)
      case 'atendimento': return await acaoAtendimento(sql, req, res, auth)
      case 'config': return await acaoConfig(sql, req, res, auth)
      case 'horarios': return await acaoHorarios(sql, req, res, auth)
      case 'bloqueios': return await acaoBloqueios(sql, req, res, auth)
      default:
        return erro(res, 400, 'ACAO_DESCONHECIDA', 'Acao desconhecida.')
    }
  } catch (err) {
    if (err instanceof AgendaNaoInstalada) {
      console.error('/api/agenda:', err.message)
      return erro(res, 503, 'AGENDA_INDISPONIVEL', 'A agenda esta indisponivel no momento.')
    }
    // A mensagem do Postgres cita nome de constraint e de coluna. Vai pro log,
    // nunca pra resposta.
    console.error(`/api/agenda?action=${action}:`, err)
    return erro(res, 500, 'ERRO_INTERNO', 'Nao foi possivel completar a acao.')
  }
}

// --------------------------------------------------------------- publico

/** Duracao do procedimento pedido, ou a da consulta padrao. */
function resolverProcedimento(procedimentos, id, { apenasPublico = true } = {}) {
  const lista = apenasPublico ? procedimentos.filter((p) => p.publico) : procedimentos
  if (id) {
    const achado = lista.find((p) => String(p.id) === String(id))
    if (achado) return achado
    return null
  }
  return lista[0] || null
}

async function comContexto(sql) {
  await varrerVencidos(sql)
  return carregarConfig(sql)
}

async function acaoDias(sql, req, res) {
  const { config, faixas, procedimentos } = await comContexto(sql)
  if (!config || !config.publico_ativo) {
    return res.status(200).json({ ok: true, aberto: false, dias: [] })
  }

  const proc = resolverProcedimento(procedimentos, req.query?.procedimentoId)
  if (!proc) return erro(res, 422, 'PROCEDIMENTO_INVALIDO', 'Procedimento nao disponivel.')

  const { janela, dias } = await contarPorDia(sql, {
    de: clean(req.query?.de, 10) || null,
    ate: clean(req.query?.ate, 10) || null,
    duracaoMin: proc.duracao_min,
    config,
    faixas,
  })

  return res.status(200).json({ ok: true, aberto: true, janela, dias })
}

async function acaoSlots(sql, req, res) {
  const { config, faixas, procedimentos } = await comContexto(sql)
  if (!config || !config.publico_ativo) {
    return res.status(200).json({ ok: true, aberto: false, slots: [] })
  }

  const dia = clean(req.query?.dia, 10)
  if (!brtDayStart(dia)) return erro(res, 400, 'DADOS_INVALIDOS', 'Dia invalido.')

  const proc = resolverProcedimento(procedimentos, req.query?.procedimentoId)
  if (!proc) return erro(res, 422, 'PROCEDIMENTO_INVALIDO', 'Procedimento nao disponivel.')

  const slots = await listarDoDia(sql, { dia, duracaoMin: proc.duracao_min, config, faixas })
  return res.status(200).json({ ok: true, aberto: true, dia, slots })
}

async function acaoProcedimentos(sql, req, res, auth) {
  const { procedimentos } = await carregarConfig(sql)
  // Sem sessao, so o que a paciente pode escolher. Retorno e urgencia sao da
  // Camilla e nao aparecem na vitrine.
  const lista = auth ? procedimentos : procedimentos.filter((p) => p.publico)
  return res.status(200).json({
    ok: true,
    procedimentos: lista.map((p) => ({
      id: p.id, nome: p.nome, duracaoMin: p.duracao_min, publico: p.publico,
    })),
  })
}

/**
 * Pedido de horario vindo do site.
 *
 * A ordem das verificacoes e deliberada: o que e barato e nao toca o banco vem
 * antes, e o INSERT — que e o unico que pode prender um horario — vem por
 * ultimo, ja com tudo revalidado no servidor.
 */
async function acaoSolicitar(sql, req, res) {
  if (req.method !== 'POST') return erro(res, 405, 'METODO', 'Metodo nao permitido.')

  // Honeypot antes de tudo: campo invisivel que so bot preenche.
  //
  // A resposta imita o sucesso no formato exato, com o horario que ele mesmo
  // mandou. Devolver um JSON mais curto seria dizer ao bot que ele foi pego, e
  // ai ele tenta outro caminho. Nenhuma das duas respostas traz id, justamente
  // pra que a falsa nao precise inventar um.
  if (clean(req.body?.website)) {
    const pedido = new Date(clean(req.body?.inicio, 40))
    const valido = !Number.isNaN(pedido.getTime())
    return res.status(200).json({
      ok: true,
      status: 'pendente',
      inicio: valido ? pedido.toISOString() : null,
      rotulo: valido ? brtLabel(pedido) : '',
      expiraEm: valido ? new Date(Date.now() + 48 * 3600 * 1000).toISOString() : null,
    })
  }

  const nome = clean(req.body?.nome, 160)
  const telefone = clean(req.body?.telefone, 40)
  const email = clean(req.body?.email, 200)
  const mensagem = clean(req.body?.mensagem, 1000)
  const primeiraConsulta = req.body?.primeiraConsulta === true
  const consentimento = req.body?.consentimento === true

  if (!nome) return erro(res, 400, 'DADOS_INVALIDOS', 'Informe seu nome.')

  const telKey = normalizaTelefone(telefone)
  if (!telKey) return erro(res, 400, 'DADOS_INVALIDOS', 'Informe um WhatsApp valido com DDD.')

  if (!consentimento) {
    return erro(res, 400, 'CONSENTIMENTO', 'E preciso aceitar o aviso de privacidade para continuar.')
  }

  const { config, faixas, procedimentos } = await comContexto(sql)
  if (!config || !config.publico_ativo) {
    return erro(res, 503, 'AGENDA_FECHADA', 'O agendamento pelo site esta fechado no momento.')
  }

  const ip = clientIp(req)
  if (await isAgendaRateLimited(ip)) {
    return erro(res, 429, 'MUITAS_TENTATIVAS', 'Voce ja fez varios pedidos. Aguarde alguns minutos.')
  }

  const limite = await limitePorTelefone(telKey)
  if (limite.bloqueado) return erro(res, 429, 'MUITAS_TENTATIVAS', limite.motivo)

  const proc = resolverProcedimento(procedimentos, req.body?.procedimentoId)
  if (!proc) return erro(res, 422, 'PROCEDIMENTO_INVALIDO', 'Escolha um procedimento valido.')

  const inicio = new Date(clean(req.body?.inicio, 40))
  const valido = validarInicio({ inicio, duracaoMin: proc.duracao_min, config, faixas })
  if (!valido.ok) return erro(res, 422, 'HORARIO_INVALIDO', valido.motivo)

  const diaKey = brtDateKey(inicio)
  const noDia = await pendentesNoDia(brtDayStart(diaKey), brtDayStart(somaDias(diaKey, 1)))
  if (noDia >= config.max_pendentes_dia) {
    return erro(res, 429, 'DIA_LOTADO', 'Esse dia ja tem muitos pedidos aguardando. Escolha outro dia.')
  }

  const r = await criarPedido(sql, {
    nome,
    telefone,
    telKey,
    email,
    inicio,
    fim: valido.fim,
    procedimentoId: proc.id,
    procedimentoNome: proc.nome,
    primeiraConsulta,
    mensagem,
    consentimentoVersao: config.consentimento_versao,
    holdHoras: config.hold_horas,
  })

  if (!r.ok) {
    if (r.code === 'HORARIO_OCUPADO') {
      return erro(res, 409, 'HORARIO_OCUPADO', 'Esse horario acabou de ser reservado. Escolha outro.')
    }
    return erro(res, 400, r.code, 'Nao foi possivel registrar o pedido.')
  }

  await recordAgenda(ip)

  // Fire and forget: o pedido ja esta salvo, e a paciente nao pode ficar
  // esperando o e-mail sair. A fila de pendentes no painel e a rede de
  // seguranca enquanto o Brevo nao estiver configurado.
  if (!r.repetido) avisarCamilla({ nome, telefone, email, mensagem, primeiraConsulta, proc, inicio, pedido: r.pedido })

  return res.status(200).json({ ok: true, ...resumoPublico(r.pedido) })
}

function avisarCamilla({ nome, telefone, email, mensagem, primeiraConsulta, proc, inicio, pedido }) {
  const destino = process.env.CONTACT_EMAIL
  if (!destino) return

  const base = process.env.APP_URL || ''
  const { subject, htmlContent, textContent } = novaSolicitacaoEmail({
    nome,
    telefone,
    email,
    procedimento: proc.nome,
    quando: brtLabel(inicio),
    expiraEm: pedido.expira_em ? brtLabel(pedido.expira_em) : null,
    mensagem,
    primeiraConsulta,
    painelUrl: base ? `${base.replace(/\/$/, '')}/admin` : '',
  })

  sendBrevoEmail({ to: destino, replyTo: email || undefined, subject, htmlContent, textContent })
    .catch((err) => console.error('aviso de agendamento:', err?.message || err))
}

// ---------------------------------------------------------------- painel

async function acaoListar(sql, req, res, auth) {
  await varrerVencidos(sql)
  const de = clean(req.query?.de, 10)
  const ate = clean(req.query?.ate, 10)
  const inicio = brtDayStart(de)
  const fim = brtDayStart(somaDias(ate || de, 1))
  if (!inicio || !fim) return erro(res, 400, 'DADOS_INVALIDOS', 'Informe o periodo.')

  const linhas = await sql`
    SELECT a.id, a.inicio, a.fim, a.status, a.origem, a.procedimento_nome,
           a.solicitante_nome, a.solicitante_telefone, a.solicitante_mensagem,
           a.primeira_consulta, a.observacoes, a.cancelado_motivo, a.expira_em,
           a.paciente_id, p.nome AS paciente_nome, p.alerta AS paciente_alerta
      FROM agendamentos a
      LEFT JOIN pacientes p ON p.id = a.paciente_id
     WHERE a.inicio >= ${inicio.toISOString()} AND a.inicio < ${fim.toISOString()}
     ORDER BY a.inicio
  `
  logAcesso(sql, {
    recurso: 'agenda', acao: 'list', userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true, agendamentos: linhas.map(paraPainel) })
}

async function acaoPendentes(sql, req, res) {
  await varrerVencidos(sql)
  const linhas = await sql`
    SELECT a.id, a.inicio, a.fim, a.status, a.procedimento_nome, a.expira_em,
           a.solicitante_nome, a.solicitante_telefone, a.solicitante_tel_key,
           a.solicitante_email, a.solicitante_mensagem, a.primeira_consulta,
           a.paciente_id, p.id AS sugestao_id, p.nome AS sugestao_nome
      FROM agendamentos a
      LEFT JOIN pacientes p
        ON p.telefone_key = a.solicitante_tel_key AND p.telefone_key IS NOT NULL
     WHERE a.status = 'pendente'
     ORDER BY a.criado_em
     LIMIT 200
  `
  return res.status(200).json({
    ok: true,
    total: linhas.length,
    pendentes: linhas.map((l) => ({
      ...paraPainel(l),
      sugestaoPaciente: l.sugestao_id ? { id: l.sugestao_id, nome: l.sugestao_nome } : null,
    })),
  })
}

function paraPainel(l) {
  return {
    id: l.id,
    inicio: new Date(l.inicio).toISOString(),
    fim: new Date(l.fim).toISOString(),
    rotulo: brtLabel(l.inicio),
    dia: brtDateKey(l.inicio),
    status: l.status,
    origem: l.origem,
    procedimento: l.procedimento_nome,
    nome: l.paciente_nome || l.solicitante_nome,
    telefone: l.solicitante_telefone,
    email: l.solicitante_email,
    mensagem: l.solicitante_mensagem,
    primeiraConsulta: l.primeira_consulta,
    observacoes: l.observacoes,
    canceladoMotivo: l.cancelado_motivo,
    expiraEm: l.expira_em ? new Date(l.expira_em).toISOString() : null,
    pacienteId: l.paciente_id,
    alerta: l.paciente_alerta || null,
  }
}

async function acaoCriar(sql, req, res, auth) {
  if (req.method !== 'POST') return erro(res, 405, 'METODO', 'Metodo nao permitido.')
  const { config, faixas, procedimentos } = await comContexto(sql)

  // No painel a Camilla pode agendar qualquer procedimento, inclusive os que
  // nao aparecem no site.
  const proc = resolverProcedimento(procedimentos, req.body?.procedimentoId, { apenasPublico: false })
  const inicio = new Date(clean(req.body?.inicio, 40))
  if (Number.isNaN(inicio.getTime())) return erro(res, 400, 'DADOS_INVALIDOS', 'Horario invalido.')

  // Encaixe fora da grade e legitimo quando quem marca e ela. A duracao vem do
  // procedimento, ou do que ela mandar explicitamente.
  const duracao = Number(req.body?.duracaoMin) || proc?.duracao_min || config.grade_min
  const fim = new Date(inicio.getTime() + duracao * 60000)

  const r = await criarPeloPainel(sql, {
    pacienteId: Number(req.body?.pacienteId) || null,
    inicio,
    fim,
    procedimentoId: proc?.id || null,
    procedimentoNome: proc?.nome || null,
    observacao: clean(req.body?.observacao, 1000),
    forcar: req.body?.forcar === true,
    userId: auth.userId,
  })

  if (!r.ok) {
    const status = r.code === 'HORARIO_OCUPADO' ? 409 : 400
    const msg = r.code === 'HORARIO_OCUPADO'
      ? 'Ja existe atendimento nesse horario.'
      : 'Nao foi possivel criar o agendamento.'
    return erro(res, status, r.code, msg)
  }

  logAcesso(sql, {
    recurso: 'agenda', recursoId: r.agendamento.id, acao: 'create',
    userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true, id: r.agendamento.id, substituiu: r.substituiu || 0 })
}

async function acaoConfirmar(sql, req, res, auth) {
  if (req.method !== 'POST') return erro(res, 405, 'METODO', 'Metodo nao permitido.')
  const id = Number(req.body?.id)
  if (!id) return erro(res, 400, 'DADOS_INVALIDOS', 'id obrigatorio.')

  const r = await confirmarPedido(sql, {
    id,
    pacienteId: Number(req.body?.pacienteId) || null,
  })
  if (!r.ok) {
    const status = r.code === 'PEDIDO_JA_TRATADO' ? 409 : 400
    return erro(res, status, r.code, 'Esse pedido ja foi tratado.')
  }

  logAcesso(sql, {
    recurso: 'agenda', recursoId: id, acao: 'update',
    userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true, id: r.id, pacienteId: r.pacienteId })
}

const STATUS_PERMITIDOS = new Set(['confirmado', 'cancelado', 'realizado', 'faltou'])

async function acaoStatus(sql, req, res, auth) {
  if (req.method !== 'POST') return erro(res, 405, 'METODO', 'Metodo nao permitido.')
  const id = Number(req.body?.id)
  const status = clean(req.body?.status, 20)
  if (!id || !STATUS_PERMITIDOS.has(status)) {
    return erro(res, 400, 'DADOS_INVALIDOS', 'Informe o agendamento e um status valido.')
  }

  const r = await mudarStatus(sql, { id, status, motivo: clean(req.body?.motivo, 200) || null })
  if (!r.ok) return erro(res, 404, r.code, 'Agendamento nao encontrado.')

  logAcesso(sql, {
    recurso: 'agenda', recursoId: id, acao: 'update',
    userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true, agendamento: r.agendamento })
}

async function acaoAtendimento(sql, req, res, auth) {
  if (req.method !== 'POST') return erro(res, 405, 'METODO', 'Metodo nao permitido.')
  const id = Number(req.body?.id)
  if (!id) return erro(res, 400, 'DADOS_INVALIDOS', 'id obrigatorio.')

  const r = await registrarAtendimento(sql, {
    id,
    procedimentoRealizado: clean(req.body?.procedimentoRealizado, 2000),
    regiao: clean(req.body?.regiao, 120),
    proximosPassos: clean(req.body?.proximosPassos, 2000),
    observacoes: clean(req.body?.observacoes, 2000),
    retornoSemanas: Number(req.body?.retornoSemanas) || null,
    marcarRealizado: req.body?.marcarRealizado !== false,
  })
  if (!r.ok) return erro(res, 404, r.code, 'Agendamento nao encontrado.')

  logAcesso(sql, {
    recurso: 'paciente', recursoId: r.agendamento.paciente_id, acao: 'update',
    userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true })
}

// --------------------------------------------------------- configuracao

async function acaoConfig(sql, req, res, auth) {
  if (req.method === 'GET') {
    const { config, faixas } = await carregarConfig(sql)
    return res.status(200).json({ ok: true, config, faixas })
  }
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return erro(res, 405, 'METODO', 'Metodo nao permitido.')
  }

  const c = req.body || {}
  const [linha] = await sql`
    UPDATE agenda_config SET
      publico_ativo      = COALESCE(${typeof c.publico_ativo === 'boolean' ? c.publico_ativo : null}, publico_ativo),
      grade_min          = COALESCE(${Number(c.grade_min) || null}, grade_min),
      buffer_min         = COALESCE(${Number.isFinite(Number(c.buffer_min)) ? Number(c.buffer_min) : null}, buffer_min),
      antecedencia_horas = COALESCE(${Number.isFinite(Number(c.antecedencia_horas)) ? Number(c.antecedencia_horas) : null}, antecedencia_horas),
      janela_dias        = COALESCE(${Number(c.janela_dias) || null}, janela_dias),
      hold_horas         = COALESCE(${Number(c.hold_horas) || null}, hold_horas),
      max_pendentes_dia  = COALESCE(${Number(c.max_pendentes_dia) || null}, max_pendentes_dia),
      atualizado_em      = NOW()
    WHERE id = 1
    RETURNING *
  `
  logAcesso(sql, {
    recurso: 'agenda', acao: 'update', userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true, config: linha })
}

/**
 * A grade e substituida inteira, nao editada linha a linha. Sao poucas faixas e
 * a tela e de arrastar — diff incremental aqui seria complexidade sem ganho.
 */
async function acaoHorarios(sql, req, res, auth) {
  if (req.method === 'GET') {
    const faixas = await sql`SELECT * FROM agenda_horarios ORDER BY dia_semana, abre_min`
    return res.status(200).json({ ok: true, faixas })
  }
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return erro(res, 405, 'METODO', 'Metodo nao permitido.')
  }

  const faixas = Array.isArray(req.body?.faixas) ? req.body.faixas : null
  if (!faixas) return erro(res, 400, 'DADOS_INVALIDOS', 'Envie a lista de faixas.')

  const limpas = faixas
    .map((f) => ({
      dia: Number(f.dia_semana ?? f.dia),
      abre: Number(f.abre_min),
      fecha: Number(f.fecha_min),
    }))
    .filter((f) =>
      Number.isInteger(f.dia) && f.dia >= 0 && f.dia <= 6 &&
      Number.isFinite(f.abre) && Number.isFinite(f.fecha) &&
      f.abre >= 0 && f.fecha <= 1440 && f.fecha > f.abre
    )

  if (limpas.length !== faixas.length) {
    return erro(res, 400, 'DADOS_INVALIDOS', 'Ha faixa com horario invalido.')
  }

  await sql`DELETE FROM agenda_horarios`
  for (const f of limpas) {
    await sql`
      INSERT INTO agenda_horarios (dia_semana, abre_min, fecha_min)
      VALUES (${f.dia}, ${f.abre}, ${f.fecha})
    `
  }

  logAcesso(sql, {
    recurso: 'agenda', acao: 'update', userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true, total: limpas.length })
}

async function acaoBloqueios(sql, req, res, auth) {
  if (req.method === 'GET') {
    const linhas = await sql`
      SELECT id, inicio, fim, motivo FROM agenda_bloqueios
      WHERE fim > NOW() - INTERVAL '30 days'
      ORDER BY inicio
    `
    return res.status(200).json({
      ok: true,
      bloqueios: linhas.map((b) => ({
        id: b.id,
        inicio: new Date(b.inicio).toISOString(),
        fim: new Date(b.fim).toISOString(),
        rotulo: brtLabel(b.inicio),
        motivo: b.motivo,
      })),
    })
  }

  if (req.method === 'DELETE') {
    const id = Number(req.query?.id)
    if (!id) return erro(res, 400, 'DADOS_INVALIDOS', 'id obrigatorio.')
    await sql`DELETE FROM agenda_bloqueios WHERE id = ${id}`
    return res.status(200).json({ ok: true })
  }

  if (req.method !== 'POST') return erro(res, 405, 'METODO', 'Metodo nao permitido.')

  const inicio = new Date(clean(req.body?.inicio, 40))
  const fim = new Date(clean(req.body?.fim, 40))
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim <= inicio) {
    return erro(res, 400, 'DADOS_INVALIDOS', 'Informe inicio e fim validos.')
  }

  const [linha] = await sql`
    INSERT INTO agenda_bloqueios (inicio, fim, motivo)
    VALUES (${inicio.toISOString()}, ${fim.toISOString()}, ${clean(req.body?.motivo, 160) || null})
    RETURNING id
  `
  logAcesso(sql, {
    recurso: 'agenda', recursoId: linha.id, acao: 'create',
    userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true, id: linha.id })
}

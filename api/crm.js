import { getDb } from './_lib/db.js'
import { ensureAgenda, AgendaNaoInstalada } from './_lib/ensureAgenda.js'
import { requireAuth } from './_lib/auth.js'
import { checkOrigin } from './_lib/origin.js'
import { clientIp } from './_lib/rateLimit.js'
import { normalizaTelefone } from './_lib/telefone.js'
import { logAcesso } from './_lib/acessoLog.js'
import { brtLabel, brtDataCurta } from './_lib/brt.js'
import {
  ESTAGIOS, ESTAGIO_INICIAL, ehEstagioValido, estaParado, tempoRelativo,
} from './_lib/funil.js'

/**
 * CRM: funil, fichas e promocao de contato em paciente.
 *
 * Arquivo separado do api/agenda.js por seguranca, nao por estetica: aqui NAO
 * existe uma unica acao publica. Um erro no switch do agenda.js, que atende o
 * site, nao consegue expor lista de paciente — o codigo de paciente nem mora
 * naquele arquivo.
 */

function clean(v, max = 300) {
  return String(v ?? '').trim().slice(0, max)
}

function erro(res, status, code, mensagem) {
  return res.status(status).json({ ok: false, code, error: mensagem })
}

export default async function handler(req, res) {
  const action = clean(req.query?.action, 40) || 'kanban'

  try {
    await ensureAgenda()
    const sql = getDb()

    if (req.method !== 'GET' && !checkOrigin(req)) {
      return erro(res, 403, 'ORIGEM_NAO_PERMITIDA', 'Origem nao permitida.')
    }

    const auth = await requireAuth(req)
    if (!auth.authorized) return erro(res, 401, 'NAO_AUTORIZADO', 'Nao autorizado.')

    // Dado de paciente nunca vai pro cache do edge nem do navegador.
    res.setHeader('Cache-Control', 'no-store, must-revalidate')

    switch (action) {
      case 'kanban': return await acaoKanban(sql, req, res, auth)
      case 'mover': return await acaoMover(sql, req, res, auth)
      case 'arquivar': return await acaoArquivar(sql, req, res, auth)
      case 'pacientes': return await acaoPacientes(sql, req, res, auth)
      case 'ficha': return await acaoFicha(sql, req, res, auth)
      case 'salvar': return await acaoSalvar(sql, req, res, auth)
      case 'exportar': return await acaoExportar(sql, req, res, auth)
      case 'apagar': return await acaoApagar(sql, req, res, auth)
      default: return erro(res, 400, 'ACAO_DESCONHECIDA', 'Acao desconhecida.')
    }
  } catch (err) {
    if (err instanceof AgendaNaoInstalada) {
      console.error('/api/crm:', err.message)
      return erro(res, 503, 'CRM_INDISPONIVEL', 'O CRM esta indisponivel no momento.')
    }
    console.error(`/api/crm?action=${action}:`, err)
    return erro(res, 500, 'ERRO_INTERNO', 'Nao foi possivel completar a acao.')
  }
}

// ------------------------------------------------------------------ kanban

/**
 * O quadro inteiro.
 *
 * A primeira coluna e uma uniao de tres origens, e e isso que faz o funil ser
 * um so: paciente ja cadastrada em 'contato', lead do formulario que ainda nao
 * virou paciente, e pedido de horario do site ainda sem dono. As duas ultimas
 * nao existem em `pacientes` de proposito — viram paciente quando a Camilla
 * age, nunca por escrita de endpoint publico.
 *
 * Dedupe por telefone: quem ja e paciente nao aparece de novo como lead.
 */
async function acaoKanban(sql, req, res, auth) {
  const [pacientes, leads, pedidos, agenda] = await sql.transaction(
    [
      sql`
        SELECT p.id, p.nome, p.telefone, p.telefone_key, p.situacao, p.situacao_em,
               p.ordem_funil, p.alerta, p.origem, p.criado_em,
               (SELECT COUNT(*) FROM agendamentos a
                 WHERE a.paciente_id = p.id AND a.status = 'realizado')::int AS atendimentos,
               (SELECT MAX(a.inicio) FROM agendamentos a
                 WHERE a.paciente_id = p.id AND a.status = 'realizado') AS ultimo
          FROM pacientes p
         WHERE p.ativo
         ORDER BY p.ordem_funil, p.situacao_em
      `,
      sql`
        SELECT l.id, l.name, l.phone, l.email, l.interest, l.message,
               l.source, l.created_at, l.telefone_key
          FROM leads l
         WHERE l.paciente_id IS NULL
           AND l.arquivado_em IS NULL
           AND (l.telefone_key IS NULL OR NOT EXISTS (
                 SELECT 1 FROM pacientes p
                  WHERE p.telefone_key = l.telefone_key AND p.ativo))
         ORDER BY l.created_at DESC
         LIMIT 300
      `,
      sql`
        SELECT a.id, a.solicitante_nome, a.solicitante_telefone, a.solicitante_tel_key,
               a.solicitante_email, a.inicio, a.status, a.procedimento_nome, a.criado_em
          FROM agendamentos a
         WHERE a.paciente_id IS NULL
           AND a.status IN ('pendente','confirmado')
           AND NOT EXISTS (
                 SELECT 1 FROM pacientes p
                  WHERE p.telefone_key = a.solicitante_tel_key AND p.ativo)
         ORDER BY a.inicio
         LIMIT 300
      `,
      sql`
        SELECT paciente_id, MIN(inicio) AS proximo
          FROM agendamentos
         WHERE status IN ('pendente','confirmado') AND inicio > NOW() AND paciente_id IS NOT NULL
         GROUP BY paciente_id
      `,
    ],
    { readOnly: true }
  )

  const proximoPorPaciente = new Map(agenda.map((a) => [a.paciente_id, a.proximo]))
  const agora = new Date()
  const cards = []

  for (const p of pacientes) {
    const proximo = proximoPorPaciente.get(p.id) || null
    cards.push({
      tipo: 'paciente',
      id: p.id,
      pacienteId: p.id,
      nome: p.nome,
      telefone: p.telefone,
      estagio: p.situacao,
      desde: new Date(p.situacao_em).toISOString(),
      tempo: tempoRelativo(p.situacao_em, agora),
      alerta: estaParado(p.situacao, p.situacao_em, agora),
      ordem: p.ordem_funil,
      aviso: p.alerta || null,
      detalhe: detalhePaciente(p, proximo, agora),
      proximo: proximo ? brtLabel(proximo, { comDiaSemana: true }) : null,
    })
  }

  for (const l of leads) {
    cards.push({
      tipo: 'lead',
      id: l.id,
      pacienteId: null,
      nome: l.name || 'Sem nome',
      telefone: l.phone,
      estagio: ESTAGIO_INICIAL,
      desde: new Date(l.created_at).toISOString(),
      tempo: tempoRelativo(l.created_at, agora),
      alerta: estaParado(ESTAGIO_INICIAL, l.created_at, agora),
      ordem: 0,
      aviso: null,
      detalhe: [l.interest, l.source === 'formulario-site' ? 'formulario' : l.source]
        .filter(Boolean).join(' · '),
      proximo: null,
    })
  }

  for (const a of pedidos) {
    cards.push({
      tipo: 'pedido',
      id: a.id,
      pacienteId: null,
      nome: a.solicitante_nome || 'Sem nome',
      telefone: a.solicitante_telefone,
      estagio: ESTAGIO_INICIAL,
      desde: new Date(a.criado_em).toISOString(),
      tempo: tempoRelativo(a.criado_em, agora),
      // Pedido de horario e mais urgente que lead: ela escolheu um horario e
      // esta esperando resposta, com o horario preso enquanto isso.
      alerta: a.status === 'pendente',
      ordem: -1,
      aviso: a.status === 'pendente' ? 'Aguardando confirmacao' : null,
      detalhe: `${a.procedimento_nome || 'Horario'} · ${brtLabel(a.inicio)}`,
      proximo: brtLabel(a.inicio),
    })
  }

  const colunas = ESTAGIOS.map((e) => ({
    id: e.id,
    label: e.label,
    ajuda: e.ajuda,
    cards: cards
      .filter((c) => c.estagio === e.id)
      .sort((a, b) => a.ordem - b.ordem || new Date(a.desde) - new Date(b.desde)),
  }))

  logAcesso(sql, {
    recurso: 'crm', acao: 'list', userId: auth.userId, username: auth.username, ip: clientIp(req),
  })

  return res.status(200).json({ ok: true, colunas, total: cards.length })
}

function detalhePaciente(p, proximo, agora) {
  if (proximo) return brtLabel(proximo)
  if (p.atendimentos > 0) {
    const plural = p.atendimentos === 1 ? 'atendimento' : 'atendimentos'
    const quando = p.ultimo ? ` · ultimo ${tempoRelativo(p.ultimo, agora)}` : ''
    return `${p.atendimentos} ${plural}${quando}`
  }
  return p.origem || 'sem atendimento ainda'
}

// ------------------------------------------------------------- mover card

/**
 * Move o card de coluna. E aqui que lead vira paciente.
 *
 * Arrastar e uma acao autenticada da Camilla, e e por isso que a promocao pode
 * acontecer neste ponto e nao no POST publico do formulario.
 */
async function acaoMover(sql, req, res, auth) {
  if (req.method !== 'POST') return erro(res, 405, 'METODO', 'Metodo nao permitido.')

  const tipo = clean(req.body?.tipo, 20)
  const id = Number(req.body?.id)
  const estagio = clean(req.body?.estagio, 20)
  const ordem = Number.isFinite(Number(req.body?.ordem)) ? Number(req.body.ordem) : 0

  if (!id || !ehEstagioValido(estagio)) {
    return erro(res, 400, 'DADOS_INVALIDOS', 'Informe o card e um estagio valido.')
  }

  let pacienteId = null
  // Card que acabou de virar paciente ja nasce no estagio de destino, entao a
  // comparacao "mudou de coluna?" mais abaixo nao veria nada. A entrada no
  // funil tambem e passagem, e precisa aparecer no historico.
  let recemPromovido = false

  if (tipo === 'paciente') {
    pacienteId = id
  } else if (tipo === 'lead') {
    const r = await promoverLead(sql, id, estagio)
    if (!r.ok) return erro(res, r.status || 400, r.code, r.mensagem)
    pacienteId = r.pacienteId
    recemPromovido = r.novo === true
  } else if (tipo === 'pedido') {
    const r = await promoverPedido(sql, id, estagio)
    if (!r.ok) return erro(res, r.status || 400, r.code, r.mensagem)
    pacienteId = r.pacienteId
    recemPromovido = r.novo === true
  } else {
    return erro(res, 400, 'DADOS_INVALIDOS', 'Tipo de card desconhecido.')
  }

  // Le o estagio atual antes de gravar. Daria pra tirar do RETURNING com uma
  // subquery, mas ali o valor depende de o Postgres avaliar a subconsulta no
  // snapshot do inicio da statement — comportamento correto, porem sutil demais
  // pra sustentar o historico do funil.
  const [antes] = await sql`SELECT situacao FROM pacientes WHERE id = ${pacienteId} AND ativo`
  if (!antes) return erro(res, 404, 'NAO_ENCONTRADO', 'Paciente nao encontrada.')

  await sql`
    UPDATE pacientes
       SET situacao = ${estagio},
           -- So reinicia o cronometro se o estagio realmente mudou. Reordenar
           -- dentro da mesma coluna nao pode apagar o "parado ha 5 dias".
           situacao_em = CASE WHEN situacao <> ${estagio} THEN NOW() ELSE situacao_em END,
           ordem_funil = ${ordem},
           atualizado_em = NOW()
     WHERE id = ${pacienteId} AND ativo
  `

  // So registra passagem de verdade: reordenar dentro da coluna nao e evento.
  if (recemPromovido || antes.situacao !== estagio) {
    await sql`
      INSERT INTO funil_eventos (paciente_id, de, para, user_id)
      VALUES (${pacienteId}, ${recemPromovido ? null : antes.situacao}, ${estagio}, ${auth.userId})
    `
  }
  logAcesso(sql, {
    recurso: 'paciente', recursoId: pacienteId, acao: 'update',
    userId: auth.userId, username: auth.username, ip: clientIp(req),
  })

  return res.status(200).json({ ok: true, pacienteId, estagio })
}

/**
 * Lead vira paciente.
 *
 * ON CONFLICT com DO UPDATE, e nao DO NOTHING, pelo mesmo motivo de sempre:
 * DO NOTHING com RETURNING devolve zero linhas, e o id do paciente existente se
 * perderia em silencio.
 */
async function promoverLead(sql, leadId, estagio) {
  const [lead] = await sql`SELECT * FROM leads WHERE id = ${leadId}`
  if (!lead) return { ok: false, status: 404, code: 'NAO_ENCONTRADO', mensagem: 'Contato nao encontrado.' }
  if (lead.paciente_id) return { ok: true, pacienteId: lead.paciente_id, novo: false }

  const chave = lead.telefone_key || normalizaTelefone(lead.phone)

  const [paciente] = chave
    ? await sql`
        INSERT INTO pacientes (nome, telefone, telefone_key, email, origem, situacao, situacao_em)
        VALUES (${lead.name || 'Sem nome'}, ${lead.phone}, ${chave}, ${lead.email || null},
                ${lead.source || 'formulario-site'}, ${estagio}, NOW())
        ON CONFLICT (telefone_key) WHERE telefone_key IS NOT NULL
        DO UPDATE SET atualizado_em = NOW()
        RETURNING id
      `
    : await sql`
        INSERT INTO pacientes (nome, telefone, email, origem, situacao, situacao_em)
        VALUES (${lead.name || 'Sem nome'}, ${lead.phone}, ${lead.email || null},
                ${lead.source || 'formulario-site'}, ${estagio}, NOW())
        RETURNING id
      `

  await sql`UPDATE leads SET paciente_id = ${paciente.id} WHERE id = ${leadId}`

  // A mensagem que ela escreveu no formulario e contexto que a Camilla vai
  // querer ler na ficha. Sem isso, promover o lead perderia o unico texto que
  // a pessoa escreveu por conta propria.
  // So preenche se estiver vazio. Concatenar com LIKE pra evitar repeticao
  // quebraria com % ou _ no texto da pessoa, e promover acontece uma vez so —
  // o lead.paciente_id acima ja garante isso.
  if (lead.message) {
    await sql`
      UPDATE pacientes
         SET observacoes = ${'Pelo formulario do site: ' + lead.message}
       WHERE id = ${paciente.id} AND observacoes IS NULL
    `
  }

  return { ok: true, pacienteId: paciente.id, novo: true }
}

/** Pedido de horario sem dono vira paciente. */
async function promoverPedido(sql, agendamentoId, estagio) {
  const [ag] = await sql`SELECT * FROM agendamentos WHERE id = ${agendamentoId}`
  if (!ag) return { ok: false, status: 404, code: 'NAO_ENCONTRADO', mensagem: 'Pedido nao encontrado.' }
  if (ag.paciente_id) return { ok: true, pacienteId: ag.paciente_id, novo: false }

  const chave = ag.solicitante_tel_key
  const [paciente] = await sql`
    INSERT INTO pacientes (
      nome, telefone, telefone_key, email, origem, situacao, situacao_em,
      consentimento_em, consentimento_versao, consentimento_origem
    )
    VALUES (
      ${ag.solicitante_nome || 'Sem nome'}, ${ag.solicitante_telefone}, ${chave},
      ${ag.solicitante_email || null}, 'agendamento-site', ${estagio}, NOW(),
      ${ag.consentimento_em}, ${ag.consentimento_versao}, 'site'
    )
    ON CONFLICT (telefone_key) WHERE telefone_key IS NOT NULL
    DO UPDATE SET atualizado_em = NOW()
    RETURNING id
  `
  await sql`UPDATE agendamentos SET paciente_id = ${paciente.id} WHERE id = ${agendamentoId}`
  return { ok: true, pacienteId: paciente.id, novo: true }
}

/** Some com o card sem apagar o registro. Spam e engano acabam aqui. */
async function acaoArquivar(sql, req, res, auth) {
  if (req.method !== 'POST') return erro(res, 405, 'METODO', 'Metodo nao permitido.')
  const id = Number(req.body?.id)
  const tipo = clean(req.body?.tipo, 20)
  if (!id) return erro(res, 400, 'DADOS_INVALIDOS', 'id obrigatorio.')

  if (tipo === 'lead') {
    await sql`UPDATE leads SET arquivado_em = NOW() WHERE id = ${id}`
  } else if (tipo === 'paciente') {
    await sql`UPDATE pacientes SET situacao = 'inativa', situacao_em = NOW() WHERE id = ${id}`
  } else {
    return erro(res, 400, 'DADOS_INVALIDOS', 'Tipo de card desconhecido.')
  }

  logAcesso(sql, {
    recurso: tipo, recursoId: id, acao: 'update',
    userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true })
}

// ------------------------------------------------------------- pacientes

async function acaoPacientes(sql, req, res, auth) {
  const q = clean(req.query?.q, 80)
  const busca = q ? `%${q.toLowerCase()}%` : null

  const linhas = busca
    ? await sql`
        SELECT id, nome, telefone, email, situacao, situacao_em, alerta
          FROM pacientes
         WHERE ativo AND (lower(nome) LIKE ${busca}
                          OR telefone_key LIKE ${`%${q.replace(/\D/g, '')}%`})
         ORDER BY nome LIMIT 100
      `
    : await sql`
        SELECT id, nome, telefone, email, situacao, situacao_em, alerta
          FROM pacientes WHERE ativo ORDER BY nome LIMIT 100
      `

  logAcesso(sql, {
    recurso: 'paciente', acao: 'list', userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true, pacientes: linhas })
}

/** Ficha completa. Cada abertura deixa rastro — e o item central da LGPD aqui. */
async function acaoFicha(sql, req, res, auth) {
  const id = Number(req.query?.id)
  if (!id) return erro(res, 400, 'DADOS_INVALIDOS', 'id obrigatorio.')

  const [paciente, historico, origem] = await sql.transaction(
    [
      sql`SELECT * FROM pacientes WHERE id = ${id} AND ativo`,
      sql`
        SELECT id, inicio, fim, status, procedimento_nome, procedimento_realizado,
               regiao, proximos_passos, observacoes, retorno_semanas, cancelado_motivo
          FROM agendamentos WHERE paciente_id = ${id} ORDER BY inicio DESC LIMIT 200
      `,
      sql`
        SELECT id, interest, message, source, created_at
          FROM leads WHERE paciente_id = ${id} ORDER BY created_at DESC LIMIT 10
      `,
    ],
    { readOnly: true }
  )

  if (paciente.length === 0) return erro(res, 404, 'NAO_ENCONTRADO', 'Paciente nao encontrada.')

  logAcesso(sql, {
    recurso: 'paciente', recursoId: id, acao: 'read',
    userId: auth.userId, username: auth.username, ip: clientIp(req),
  })

  const realizados = historico.filter((h) => h.status === 'realizado')
  return res.status(200).json({
    ok: true,
    paciente: paciente[0],
    primeiraConsulta: realizados.length === 0,
    historico: historico.map((h) => ({
      ...h,
      inicio: new Date(h.inicio).toISOString(),
      rotulo: brtLabel(h.inicio),
      data: brtDataCurta(h.inicio),
    })),
    contatos: origem,
  })
}

async function acaoSalvar(sql, req, res, auth) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return erro(res, 405, 'METODO', 'Metodo nao permitido.')
  }
  const id = Number(req.body?.id) || null
  const nome = clean(req.body?.nome, 160)
  if (!nome) return erro(res, 400, 'DADOS_INVALIDOS', 'O nome e obrigatorio.')

  const telefone = clean(req.body?.telefone, 40)
  const chave = normalizaTelefone(telefone)
  const campos = {
    nome,
    telefone: telefone || null,
    chave,
    email: clean(req.body?.email, 200) || null,
    nascimento: clean(req.body?.nascimento, 10) || null,
    origem: clean(req.body?.origem, 60) || null,
    indicadoPor: clean(req.body?.indicadoPor, 160) || null,
    bairro: clean(req.body?.bairro, 120) || null,
    cidade: clean(req.body?.cidade, 120) || null,
    contatoPref: clean(req.body?.contatoPref, 120) || null,
    alerta: clean(req.body?.alerta, 500) || null,
    observacoes: clean(req.body?.observacoes, 4000) || null,
  }

  try {
    const linhas = id
      ? await sql`
          UPDATE pacientes SET
            nome = ${campos.nome}, telefone = ${campos.telefone}, telefone_key = ${campos.chave},
            email = ${campos.email}, nascimento = ${campos.nascimento},
            origem = ${campos.origem}, indicado_por = ${campos.indicadoPor},
            bairro = ${campos.bairro}, cidade = ${campos.cidade},
            contato_pref = ${campos.contatoPref}, alerta = ${campos.alerta},
            observacoes = ${campos.observacoes}, atualizado_em = NOW()
          WHERE id = ${id} AND ativo
          RETURNING id
        `
      : await sql`
          INSERT INTO pacientes (
            nome, telefone, telefone_key, email, nascimento, origem, indicado_por,
            bairro, cidade, contato_pref, alerta, observacoes, situacao, situacao_em,
            consentimento_origem
          ) VALUES (
            ${campos.nome}, ${campos.telefone}, ${campos.chave}, ${campos.email},
            ${campos.nascimento}, ${campos.origem}, ${campos.indicadoPor},
            ${campos.bairro}, ${campos.cidade}, ${campos.contatoPref}, ${campos.alerta},
            ${campos.observacoes}, ${ESTAGIO_INICIAL}, NOW(), 'presencial'
          )
          RETURNING id
        `

    if (linhas.length === 0) return erro(res, 404, 'NAO_ENCONTRADO', 'Paciente nao encontrada.')

    logAcesso(sql, {
      recurso: 'paciente', recursoId: linhas[0].id, acao: id ? 'update' : 'create',
      userId: auth.userId, username: auth.username, ip: clientIp(req),
    })
    return res.status(200).json({ ok: true, id: linhas[0].id })
  } catch (err) {
    if (err?.code === '23505') {
      return erro(res, 409, 'DUPLICADO', 'Ja existe uma paciente com esse telefone.')
    }
    throw err
  }
}

/** Portabilidade (LGPD art. 18): tudo que existe sobre a pessoa, em CSV. */
async function acaoExportar(sql, req, res, auth) {
  const id = Number(req.query?.id)
  if (!id) return erro(res, 400, 'DADOS_INVALIDOS', 'id obrigatorio.')

  const [paciente, historico] = await sql.transaction(
    [
      sql`SELECT * FROM pacientes WHERE id = ${id}`,
      sql`
        SELECT inicio, status, procedimento_nome, procedimento_realizado, regiao,
               proximos_passos, observacoes
          FROM agendamentos WHERE paciente_id = ${id} ORDER BY inicio
      `,
    ],
    { readOnly: true }
  )
  if (paciente.length === 0) return erro(res, 404, 'NAO_ENCONTRADO', 'Paciente nao encontrada.')

  logAcesso(sql, {
    recurso: 'paciente', recursoId: id, acao: 'export',
    userId: auth.userId, username: auth.username, ip: clientIp(req),
  })

  return res.status(200).json({
    ok: true,
    paciente: paciente[0],
    historico: historico.map((h) => ({ ...h, quando: brtLabel(h.inicio) })),
  })
}

/**
 * Exclusao a pedido da titular.
 *
 * Anonimiza em vez de DELETE: o agendamento precisa continuar existindo pra
 * agenda passada nao ficar com buraco, mas nada nele identifica mais ninguem.
 * O que some e o que e dado pessoal.
 */
async function acaoApagar(sql, req, res, auth) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return erro(res, 405, 'METODO', 'Metodo nao permitido.')
  }
  const id = Number(req.query?.id || req.body?.id)
  if (!id) return erro(res, 400, 'DADOS_INVALIDOS', 'id obrigatorio.')

  await sql`
    UPDATE agendamentos
       SET solicitante_nome = NULL, solicitante_telefone = NULL, solicitante_tel_key = NULL,
           solicitante_email = NULL, solicitante_mensagem = NULL,
           procedimento_realizado = NULL, regiao = NULL, proximos_passos = NULL,
           observacoes = NULL, atualizado_em = NOW()
     WHERE paciente_id = ${id}
  `
  await sql`UPDATE leads SET name = NULL, phone = NULL, email = NULL, message = NULL,
                             telefone_key = NULL, arquivado_em = NOW()
             WHERE paciente_id = ${id}`
  await sql`
    UPDATE pacientes
       SET ativo = FALSE, nome = 'Paciente removida', telefone = NULL, telefone_key = NULL,
           email = NULL, nascimento = NULL, bairro = NULL, cidade = NULL,
           contato_pref = NULL, alerta = NULL, observacoes = NULL, indicado_por = NULL,
           atualizado_em = NOW()
     WHERE id = ${id}
  `

  logAcesso(sql, {
    recurso: 'paciente', recursoId: id, acao: 'delete',
    userId: auth.userId, username: auth.username, ip: clientIp(req),
  })
  return res.status(200).json({ ok: true })
}

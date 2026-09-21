import { brtLabel } from './brt.js'
import { ESTAGIO_AO_CONFIRMAR } from './funil.js'

/**
 * Escritas da agenda.
 *
 * Mora fora do handler pra que api/agenda.js fique sendo so roteador — o limite
 * de 12 funcoes serverless do plano Hobby obriga a concentrar acoes num arquivo
 * so, e sem isso ele viraria um monolito de mil linhas.
 */

// Codigos do Postgres que a agenda sabe interpretar.
const PG_EXCLUSAO = '23P01' // conflicting key value violates exclusion constraint
const PG_UNICO = '23505'
const PG_CHECK = '23514'
const PG_DADO = '22000' // range lower bound must be less than upper bound

// Janela em que um segundo pedido identico e tratado como o mesmo clique, e nao
// como conflito. Sem isso a paciente que clicou duas vezes ouve "esse horario
// acabou de ser reservado" — pelo pedido dela mesma.
const JANELA_DUPLO_CLIQUE = '60 seconds'

/**
 * Traduz erro do banco em codigo da aplicacao.
 * Nunca devolve err.message: a mensagem do Postgres cita nome de constraint e
 * de coluna, e isso nao vai pra resposta publica.
 */
export function traduzErro(err) {
  switch (err?.code) {
    case PG_EXCLUSAO:
      return 'HORARIO_OCUPADO'
    case PG_UNICO:
      return 'DUPLICADO'
    case PG_CHECK:
    case PG_DADO:
      return 'DADOS_INVALIDOS'
    default:
      return null
  }
}

/** Projecao publica de um agendamento — o que pode voltar pra quem nao esta logado. */
export function resumoPublico(linha) {
  return {
    status: linha.status,
    inicio: new Date(linha.inicio).toISOString(),
    rotulo: brtLabel(linha.inicio),
    expiraEm: linha.expira_em ? new Date(linha.expira_em).toISOString() : null,
  }
}

/**
 * Pedido vindo do site. Nasce pendente e com validade.
 *
 * Nao cria paciente: deixar um desconhecido escrever na tabela de dado de saude
 * e ruim pra LGPD, e decidir se esta Maria e a Maria de 2024 e trabalho humano.
 * O vinculo acontece na confirmacao.
 *
 * @returns {{ok: true, pedido: object, repetido?: boolean} | {ok: false, code: string}}
 */
export async function criarPedido(sql, dados) {
  const {
    nome, telefone, telKey, email, inicio, fim, procedimentoId, procedimentoNome,
    primeiraConsulta, mensagem, consentimentoVersao, holdHoras,
  } = dados

  try {
    const [pedido] = await sql`
      INSERT INTO agendamentos (
        solicitante_nome, solicitante_telefone, solicitante_tel_key, solicitante_email,
        solicitante_mensagem, primeira_consulta,
        inicio, fim, procedimento_id, procedimento_nome,
        status, origem, consentimento_em, consentimento_versao, expira_em
      ) VALUES (
        ${nome}, ${telefone}, ${telKey}, ${email || null},
        ${mensagem || null}, ${primeiraConsulta},
        ${inicio.toISOString()}, ${fim.toISOString()}, ${procedimentoId}, ${procedimentoNome},
        'pendente', 'site', NOW(), ${consentimentoVersao},
        NOW() + ${holdHoras + ' hours'}::interval
      )
      RETURNING status, inicio, expira_em
    `
    return { ok: true, pedido }
  } catch (err) {
    const code = traduzErro(err)
    if (code !== 'HORARIO_OCUPADO') {
      if (code) return { ok: false, code }
      throw err
    }

    // O conflito pode ser com o pedido que ela mesma acabou de mandar.
    const [meu] = await sql`
      SELECT status, inicio, expira_em
      FROM agendamentos
      WHERE solicitante_tel_key = ${telKey}
        AND inicio = ${inicio.toISOString()}
        AND status = 'pendente'
        AND criado_em > NOW() - ${JANELA_DUPLO_CLIQUE}::interval
      LIMIT 1
    `
    if (meu) return { ok: true, pedido: meu, repetido: true }

    return { ok: false, code: 'HORARIO_OCUPADO' }
  }
}

/**
 * Confirma um pedido e resolve o paciente numa statement so.
 *
 * Duas escritas que nao podem aplicar pela metade, e o id do paciente novo e
 * necessario entre elas — exatamente o que sql.transaction() nao permite, por
 * ser nao interativa. Dai o CTE.
 *
 * Tres armadilhas embutidas aqui, todas ja custaram tempo de alguem:
 *
 * - ON CONFLICT DO NOTHING ... RETURNING devolve zero linhas. Se o telefone ja
 *   existisse, paciente_id viraria NULL em silencio. Por isso e DO UPDATE com
 *   um no-op, que forca o RETURNING.
 * - CTE que escreve roda mesmo quando o UPDATE principal nao casa nada. Sem o
 *   filtro de status dentro do SELECT de `pedido`, duplo clique criaria um
 *   paciente orfao por clique.
 * - Indice unico parcial exige o predicado no ON CONFLICT, senao o Postgres nao
 *   encontra o indice e erra em execucao.
 *
 * @returns {{ok: true, id: number, pacienteId: number} | {ok: false, code: string}}
 */
export async function confirmarPedido(sql, { id, pacienteId = null }) {
  try {
    const linhas = await sql`
      WITH pedido AS (
        SELECT id, solicitante_nome, solicitante_telefone, solicitante_tel_key,
               solicitante_email, consentimento_em, consentimento_versao
        FROM agendamentos
        WHERE id = ${id} AND status = 'pendente' AND paciente_id IS NULL
          AND ${pacienteId}::int IS NULL
      ),
      novo AS (
        INSERT INTO pacientes (
          nome, telefone, telefone_key, email,
          consentimento_em, consentimento_versao, consentimento_origem,
          situacao, situacao_em
        )
        SELECT solicitante_nome, solicitante_telefone, solicitante_tel_key,
               solicitante_email, consentimento_em, consentimento_versao, 'site',
               ${ESTAGIO_AO_CONFIRMAR}, NOW()
        FROM pedido
        ON CONFLICT (telefone_key) WHERE telefone_key IS NOT NULL
        -- Ja existia: nao rebaixa nem promove o estagio dela. Quem esta em
        -- tratamento e marcou mais uma sessao continua em tratamento; quem
        -- estava so como contato sobe pra avaliacao, que e o que acabou de
        -- acontecer de fato.
        DO UPDATE SET
          atualizado_em = NOW(),
          situacao = CASE WHEN pacientes.situacao = 'contato'
                          THEN ${ESTAGIO_AO_CONFIRMAR} ELSE pacientes.situacao END,
          situacao_em = CASE WHEN pacientes.situacao = 'contato'
                             THEN NOW() ELSE pacientes.situacao_em END
        RETURNING id
      )
      UPDATE agendamentos a
         SET status = 'confirmado',
             confirmado_em = NOW(),
             expira_em = NULL,
             paciente_id = COALESCE(a.paciente_id, ${pacienteId}::int, (SELECT id FROM novo)),
             atualizado_em = NOW()
       WHERE a.id = ${id} AND a.status = 'pendente'
      RETURNING a.id, a.paciente_id, a.solicitante_nome, a.solicitante_email,
                a.inicio, a.procedimento_nome
    `
    if (linhas.length === 0) return { ok: false, code: 'PEDIDO_JA_TRATADO' }
    return { ok: true, id: linhas[0].id, pacienteId: linhas[0].paciente_id, agendamento: linhas[0] }
  } catch (err) {
    const code = traduzErro(err)
    if (code) return { ok: false, code }
    throw err
  }
}

/**
 * Muda o status. Cancelar e recusar sao o mesmo movimento com motivos
 * diferentes; ambos liberam o horario, porque a constraint so cobre
 * pendente, confirmado e realizado.
 */
export async function mudarStatus(sql, { id, status, motivo = null }) {
  const linhas = await sql`
    UPDATE agendamentos
       SET status = ${status},
           cancelado_motivo = CASE WHEN ${status} IN ('cancelado','faltou')
                                   THEN ${motivo} ELSE cancelado_motivo END,
           expira_em = CASE WHEN ${status} = 'pendente' THEN expira_em ELSE NULL END,
           atualizado_em = NOW()
     WHERE id = ${id}
    RETURNING id, status, paciente_id, origem,
              solicitante_nome, solicitante_email, inicio, procedimento_nome
  `
  if (linhas.length === 0) return { ok: false, code: 'NAO_ENCONTRADO' }
  return { ok: true, agendamento: linhas[0] }
}

/**
 * Cria um agendamento direto pelo painel (encaixe, retorno marcado na cadeira).
 *
 * `forcar` existe pra Camilla resolver conflito com pedido pendente sem ter que
 * cancelar na mao. Nunca passa por cima de confirmado nem de realizado: ali ela
 * precisa decidir explicitamente.
 */
export async function criarPeloPainel(sql, dados) {
  const { pacienteId, inicio, fim, procedimentoId, procedimentoNome, observacao, forcar, userId } = dados

  const inserir = () => sql`
    INSERT INTO agendamentos (
      paciente_id, inicio, fim, procedimento_id, procedimento_nome,
      status, origem, observacoes, criado_por
    ) VALUES (
      ${pacienteId || null}, ${inicio.toISOString()}, ${fim.toISOString()},
      ${procedimentoId || null}, ${procedimentoNome || null},
      'confirmado', 'painel', ${observacao || null}, ${userId || null}
    )
    RETURNING id, inicio, fim, status
  `

  try {
    const [linha] = await inserir()
    return { ok: true, agendamento: linha }
  } catch (err) {
    if (traduzErro(err) !== 'HORARIO_OCUPADO') {
      const code = traduzErro(err)
      if (code) return { ok: false, code }
      throw err
    }
    if (!forcar) return { ok: false, code: 'HORARIO_OCUPADO' }

    const cancelados = await sql`
      UPDATE agendamentos
         SET status = 'cancelado',
             cancelado_motivo = 'Substituido por agendamento do painel',
             expira_em = NULL, atualizado_em = NOW()
       WHERE status = 'pendente'
         AND inicio < ${fim.toISOString()} AND fim > ${inicio.toISOString()}
      -- Devolve o contato de quem foi atropelado: quem pediu o horario pelo
      -- site precisa saber que ele caiu. Ver avisarPaciente em agenda.js.
      RETURNING id, solicitante_nome, solicitante_email, inicio
    `
    if (cancelados.length === 0) return { ok: false, code: 'HORARIO_OCUPADO' }

    try {
      const [linha] = await inserir()
      return { ok: true, agendamento: linha, substituiu: cancelados.length, cancelados }
    } catch (err2) {
      const code = traduzErro(err2)
      if (code) return { ok: false, code }
      throw err2
    }
  }
}

/** Registra o que foi feito. A ficha leve vive no proprio agendamento. */
export async function registrarAtendimento(sql, dados) {
  const { id, procedimentoRealizado, regiao, proximosPassos, observacoes, retornoSemanas, marcarRealizado } = dados

  const linhas = await sql`
    UPDATE agendamentos
       SET procedimento_realizado = ${procedimentoRealizado || null},
           regiao = ${regiao || null},
           proximos_passos = ${proximosPassos || null},
           observacoes = ${observacoes || null},
           retorno_semanas = ${retornoSemanas ?? null},
           status = CASE WHEN ${!!marcarRealizado} THEN 'realizado' ELSE status END,
           atualizado_em = NOW()
     WHERE id = ${id}
    RETURNING id, status, paciente_id
  `
  if (linhas.length === 0) return { ok: false, code: 'NAO_ENCONTRADO' }
  return { ok: true, agendamento: linhas[0] }
}

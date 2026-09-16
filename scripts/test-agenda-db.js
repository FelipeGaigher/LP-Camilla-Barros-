/**
 * Teste das regras de agenda no banco. `npm run test:db`.
 *
 * Roda a migration 003 contra um Postgres descartavel em Docker e ataca o que
 * o banco promete: nenhum duplo agendamento, status que libera horario, dedupe
 * de paciente por telefone e confirmacao que nao cria paciente orfao.
 *
 * Isso mora aqui, e nao na cabeca de quem escreveu, porque a protecao de duplo
 * agendamento e uma constraint parcial: mudar a lista de status da constraint e
 * uma linha, e quebra a feature inteira sem nenhum erro aparecer.
 *
 * Pula sozinho se o Docker nao estiver rodando — nao trava o build de quem so
 * quer mexer no site.
 */
import { execFileSync } from 'node:child_process'
import { up as up003 } from './migrations/003_agenda.js'
import { up as up004 } from './migrations/004_funil.js'
import {
  criarPedido, confirmarPedido, mudarStatus, criarPeloPainel, registrarAtendimento,
} from '../api/_lib/agendaOps.js'

const CONTAINER = 'lp-camilla-test-db'
const IMAGEM = 'postgres:17-alpine'
const SEP = '~|~'

// ---------------------------------------------------------------- utilidades
function docker(args, opts = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts })
}

function literal(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return (v ? 'TRUE' : 'FALSE')
  if (v instanceof Date) return `'${v.toISOString()}'::timestamptz`
  return `'${String(v).replace(/'/g, "''")}'`
}

class PgError extends Error {
  constructor(msg, code) {
    super(msg)
    this.code = code
  }
}

function psql(texto) {
  try {
    const out = docker([
      'exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'camilla',
      // -q suprime a tag de comando ("UPDATE 1"), que senao vira linha de
      // resultado e faz RETURNING parecer devolver uma linha a mais.
      // Sem -t de proposito: a primeira linha e o cabecalho, e e dela que saem
      // os nomes de coluna — o codigo de producao le linha.paciente_id, nao [1].
      '-q', '-v', 'ON_ERROR_STOP=1', '-A', '-F', SEP, '-c', texto,
    ])
    const linhas = out
      .split('\n')
      .map((l) => l.replace(/\r$/, ''))
      .filter((l) => l.trim() !== '')
      // Sem -t o psql imprime o rodape "(N rows)". Deixar isso passar como
      // linha de dados faz um resultado VAZIO parecer ter uma linha — foi assim
      // que o `SELECT 1 FROM pg_constraint` da migration virou "ja existe" e a
      // constraint de sobreposicao nunca chegou a ser criada.
      .filter((l) => !/^\(\d+ rows?\)$/.test(l.trim()))
    if (linhas.length === 0) return []
    const colunas = linhas[0].split(SEP)
    return linhas.slice(1).map((l) => {
      const valores = l.split(SEP)
      return Object.fromEntries(colunas.map((c, i) => [c, valores[i] === '' ? null : valores[i]]))
    })
  } catch (err) {
    const saida = String(err.stderr || err.stdout || err.message)
    const m = /ERROR:\s+(.*)/.exec(saida)
    let code = null
    if (/range lower bound must be less than/i.test(saida)) code = '22000'
    else if (/conflicting key value violates exclusion constraint/i.test(saida)) code = '23P01'
    else if (/duplicate key value violates unique constraint/i.test(saida)) code = '23505'
    else if (/violates check constraint/i.test(saida)) code = '23514'
    throw new PgError(m ? m[1] : saida.trim(), code)
  }
}

/** Tagged template no formato que a migration e o agendaOps esperam. */
function sql(strings, ...vals) {
  let texto = ''
  strings.forEach((s, i) => {
    texto += s
    if (i < vals.length) texto += literal(vals[i])
  })
  return Promise.resolve(psql(texto))
}

// O driver do Neon expoe sql.transaction para rodar varias statements num POST
// so. Aqui o tagged template ja executou na hora de montar o array, entao
// juntar as promessas basta pro proposito do teste.
sql.transaction = (queries) => Promise.all(queries)

/** Primeira coluna da primeira linha. */
function um(texto) {
  const r = psql(texto)
  return r.length ? Object.values(r[0])[0] : null
}

let falhas = 0
function eq(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas += 1
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}` +
    (ok ? '' : `\n      obtido: ${JSON.stringify(obtido)}  esperado: ${JSON.stringify(esperado)}`))
}
function recusa(nome, fn, codigoEsperado) {
  try {
    fn()
    falhas += 1
    console.log(`FALHA ${nome}\n      deixou passar, deveria recusar`)
  } catch (err) {
    const ok = err instanceof PgError && err.code === codigoEsperado
    if (!ok) falhas += 1
    console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome} -> ${err.code || '?'}` +
      (ok ? '' : `\n      esperava ${codigoEsperado}: ${err.message}`))
  }
}

// -------------------------------------------------------------- preparacao
try {
  docker(['info'])
} catch {
  console.log('test:db pulado — Docker nao esta rodando.')
  console.log('Para rodar: abra o Docker Desktop e repita `npm run test:db`.')
  process.exit(0)
}

console.log(`subindo ${IMAGEM} em ${CONTAINER}...`)
try { docker(['rm', '-f', CONTAINER]) } catch { /* nao existia */ }
docker(['run', '-d', '--name', CONTAINER, '-e', 'POSTGRES_PASSWORD=teste',
        '-e', 'POSTGRES_DB=camilla', IMAGEM])

let pronto = false
for (let i = 0; i < 60; i += 1) {
  try {
    docker(['exec', CONTAINER, 'pg_isready', '-U', 'postgres', '-d', 'camilla'])
    pronto = true
    break
  } catch {
    execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},1000)'])
  }
}
if (!pronto) {
  console.error('postgres nao subiu a tempo')
  process.exit(1)
}

try {
  // ------------------------------------------------------------ a migration
  console.log('\n=== migrations 003 e 004 ===')
  // Precisa rodar a tabela de leads antes: a 004 acrescenta colunas nela.
  psql(`CREATE TABLE IF NOT EXISTS leads (
          id SERIAL PRIMARY KEY, name VARCHAR(160), phone VARCHAR(40),
          email VARCHAR(200), interest VARCHAR(160), message TEXT,
          source VARCHAR(60), created_at TIMESTAMPTZ DEFAULT NOW())`)
  await up003(sql)
  await up004(sql)
  console.log('aplicaram sem erro\n')

  console.log('--- estrutura')
  eq('as tabelas do consultorio existem',
    psql(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1`).map((r) => r.tablename),
    ['acesso_log', 'agenda_bloqueios', 'agenda_config', 'agenda_horarios',
     'agenda_procedimentos', 'agendamentos', 'funil_eventos', 'leads', 'pacientes'])
  eq('situacao virou estagio do funil',
    um(`SELECT column_default FROM information_schema.columns
        WHERE table_name='pacientes' AND column_name='situacao'`), "'contato'::character varying")
  eq('lead ganhou vinculo com paciente',
    um(`SELECT count(*) FROM information_schema.columns
        WHERE table_name='leads' AND column_name IN ('paciente_id','arquivado_em','telefone_key')`), '3')
  eq('constraint de exclusao existe',
    um(`SELECT contype FROM pg_constraint WHERE conname='agendamentos_sem_sobreposicao'`), 'x')
  eq('periodo e coluna gerada',
    um(`SELECT is_generated FROM information_schema.columns
        WHERE table_name='agendamentos' AND column_name='periodo'`), 'ALWAYS')

  console.log('\n--- semente')
  eq('8 procedimentos', um(`SELECT count(*) FROM agenda_procedimentos`), '8')
  eq('6 publicos', um(`SELECT count(*) FROM agenda_procedimentos WHERE publico`), '6')
  eq('10 faixas', um(`SELECT count(*) FROM agenda_horarios`), '10')
  eq('publico nasce desligado', um(`SELECT publico_ativo FROM agenda_config WHERE id=1`), 'f')

  console.log('\n--- idempotencia')
  await up003(sql)
  await up004(sql)
  eq('nao duplica procedimento', um(`SELECT count(*) FROM agenda_procedimentos`), '8')
  eq('nao duplica faixa', um(`SELECT count(*) FROM agenda_horarios`), '10')
  eq('nao duplica config', um(`SELECT count(*) FROM agenda_config`), '1')
  recusa('config e singleton', () => psql(`INSERT INTO agenda_config (id) VALUES (2)`), '23514')

  // -------------------------------------------- o coracao: duplo agendamento
  console.log('\n--- duplo agendamento')
  psql(`INSERT INTO agendamentos (solicitante_nome, inicio, fim, status)
        VALUES ('Ana','2026-03-12T11:00:00Z','2026-03-12T12:00:00Z','confirmado')`)
  eq('periodo derivou de inicio e fim',
    um(`SELECT periodo::text FROM agendamentos WHERE solicitante_nome='Ana'`),
    '["2026-03-12 11:00:00+00","2026-03-12 12:00:00+00")')

  for (const [nome, ini, fim] of [
    ['sobreposicao exata', '11:00', '12:00'],
    ['sobreposicao parcial', '11:30', '12:30'],
    ['agendamento que engloba', '10:00', '14:00'],
  ]) {
    recusa(`${nome} e recusada`, () => psql(`
      INSERT INTO agendamentos (solicitante_nome, inicio, fim, status)
      VALUES ('Bia','2026-03-12T${ini}:00Z','2026-03-12T${fim}:00Z','pendente')`), '23P01')
  }

  psql(`INSERT INTO agendamentos (solicitante_nome, inicio, fim, status)
        VALUES ('Encostado','2026-03-12T12:00:00Z','2026-03-12T13:00:00Z','pendente')`)
  eq('encostar no fim NAO e sobreposicao',
    um(`SELECT count(*) FROM agendamentos WHERE solicitante_nome='Encostado'`), '1')

  console.log('\n--- quais status prendem a cadeira')
  psql(`UPDATE agendamentos SET status='cancelado' WHERE solicitante_nome='Ana'`)
  psql(`INSERT INTO agendamentos (solicitante_nome, inicio, fim, status)
        VALUES ('Pos cancelamento','2026-03-12T11:00:00Z','2026-03-12T12:00:00Z','pendente')`)
  eq('cancelado libera', um(`SELECT count(*) FROM agendamentos WHERE solicitante_nome='Pos cancelamento'`), '1')

  psql(`UPDATE agendamentos SET status='expirado' WHERE solicitante_nome='Pos cancelamento'`)
  psql(`INSERT INTO agendamentos (solicitante_nome, inicio, fim, status)
        VALUES ('Pos expiracao','2026-03-12T11:00:00Z','2026-03-12T12:00:00Z','confirmado')`)
  eq('expirado libera', um(`SELECT count(*) FROM agendamentos WHERE solicitante_nome='Pos expiracao'`), '1')

  recusa('realizado continua ocupando', () => psql(`
    INSERT INTO agendamentos (solicitante_nome, inicio, fim, status)
    VALUES ('Intruso','2026-03-12T11:15:00Z','2026-03-12T11:45:00Z','realizado')`), '23P01')

  console.log('\n--- coerencia')
  // Quem recusa fim<inicio e a coluna GERADA, nao o CHECK: tstzrange() explode
  // antes, com 22000 em vez de 23514. O handler trata os dois como invalido.
  recusa('fim antes do inicio (22000, da coluna gerada)', () => psql(`
    INSERT INTO agendamentos (solicitante_nome, inicio, fim)
    VALUES ('Invertido','2026-04-01T12:00:00Z','2026-04-01T11:00:00Z')`), '22000')
  recusa('status inventado', () => psql(`
    INSERT INTO agendamentos (solicitante_nome, inicio, fim, status)
    VALUES ('X','2026-04-01T11:00:00Z','2026-04-01T12:00:00Z','talvez')`), '23514')
  recusa('faixa invertida', () => psql(`
    INSERT INTO agenda_horarios (dia_semana, abre_min, fecha_min) VALUES (1,720,480)`), '23514')
  recusa('dia da semana fora de 0-6', () => psql(`
    INSERT INTO agenda_horarios (dia_semana, abre_min, fecha_min) VALUES (9,480,720)`), '23514')

  console.log('\n--- dedupe de paciente')
  psql(`INSERT INTO pacientes (nome, telefone, telefone_key)
        VALUES ('Ana Silva','(27) 99999-0000','5527999990000')`)
  recusa('mesmo telefone recusado', () => psql(`
    INSERT INTO pacientes (nome, telefone_key) VALUES ('Ana S.','5527999990000')`), '23505')
  psql(`INSERT INTO pacientes (nome) VALUES ('Sem telefone 1')`)
  psql(`INSERT INTO pacientes (nome) VALUES ('Sem telefone 2')`)
  eq('sem telefone nao dedupe (indice parcial)',
    um(`SELECT count(*) FROM pacientes WHERE telefone_key IS NULL`), '2')

  // A partir daqui o teste exercita o codigo que vai pra producao, nao uma
  // copia do SQL. Copia de SQL em teste passa depois que o original quebrou.
  console.log('\n--- criarPedido (agendaOps)')
  const pedidoBase = {
    nome: 'Carla Nova', telefone: '(27) 98888-0000', telKey: '5527988880000',
    email: null, procedimentoId: null, procedimentoNome: 'Avaliacao',
    primeiraConsulta: true, mensagem: null, consentimentoVersao: 'v1', holdHoras: 48,
  }
  const r0 = await criarPedido(sql, {
    ...pedidoBase,
    inicio: new Date('2026-05-01T13:00:00Z'), fim: new Date('2026-05-01T14:00:00Z'),
  })
  eq('pedido criado', r0.ok, true)
  eq('nasce pendente', r0.pedido.status, 'pendente')
  eq('nasce com validade', r0.pedido.expira_em !== null, true)
  eq('nao criou paciente ainda', um(`SELECT count(*) FROM pacientes WHERE telefone_key='5527988880000'`), '0')

  console.log('\n--- duplo clique da paciente nao vira 409')
  const rDuplo = await criarPedido(sql, {
    ...pedidoBase,
    inicio: new Date('2026-05-01T13:00:00Z'), fim: new Date('2026-05-01T14:00:00Z'),
  })
  eq('segundo clique volta ok', rDuplo.ok, true)
  eq('marcado como repetido', rDuplo.repetido, true)
  eq('nao criou linha nova', um(`SELECT count(*) FROM agendamentos WHERE solicitante_tel_key='5527988880000'`), '1')

  console.log('\n--- outra pessoa no mesmo horario leva 409')
  const rOutra = await criarPedido(sql, {
    ...pedidoBase, nome: 'Outra', telKey: '5527911110000',
    inicio: new Date('2026-05-01T13:00:00Z'), fim: new Date('2026-05-01T14:00:00Z'),
  })
  eq('recusado', rOutra.ok, false)
  eq('com codigo de horario ocupado', rOutra.code, 'HORARIO_OCUPADO')

  console.log('\n--- confirmarPedido (agendaOps)')
  const idNovo = Number(um(`SELECT id FROM agendamentos WHERE solicitante_tel_key='5527988880000'`))
  const c1 = await confirmarPedido(sql, { id: idNovo })
  eq('confirmou', c1.ok, true)
  eq('vinculou paciente', c1.pacienteId != null, true)
  eq('paciente criado a partir do pedido',
    um(`SELECT nome FROM pacientes WHERE telefone_key='5527988880000'`), 'Carla Nova')
  eq('expira_em foi limpo', um(`SELECT expira_em FROM agendamentos WHERE id=${idNovo}`), null)

  const antes = um(`SELECT count(*) FROM pacientes`)
  const c2 = await confirmarPedido(sql, { id: idNovo })
  eq('confirmar de novo e recusado', c2.ok, false)
  eq('com codigo proprio', c2.code, 'PEDIDO_JA_TRATADO')
  eq('e nao cria paciente orfao', um(`SELECT count(*) FROM pacientes`), antes)

  console.log('\n--- telefone ja cadastrado: vincula em vez de duplicar')
  await criarPedido(sql, {
    ...pedidoBase, nome: 'Ana Silva', telKey: '5527999990000',
    inicio: new Date('2026-05-02T13:00:00Z'), fim: new Date('2026-05-02T14:00:00Z'),
  })
  const idExistente = Number(um(`SELECT id FROM agendamentos WHERE inicio='2026-05-02T13:00:00Z'`))
  const antes2 = um(`SELECT count(*) FROM pacientes`)
  const c3 = await confirmarPedido(sql, { id: idExistente })
  eq('confirmou', c3.ok, true)
  eq('reaproveitou paciente existente', um(`SELECT count(*) FROM pacientes`), antes2)
  eq('vinculou ao paciente certo',
    um(`SELECT p.nome FROM agendamentos a JOIN pacientes p ON p.id=a.paciente_id WHERE a.id=${idExistente}`),
    'Ana Silva')

  console.log('\n--- confirmar vinculando a um paciente escolhido a mao')
  await criarPedido(sql, {
    ...pedidoBase, nome: 'Grafia Errada', telKey: '5527922220000',
    inicio: new Date('2026-05-03T13:00:00Z'), fim: new Date('2026-05-03T14:00:00Z'),
  })
  const idEscolha = Number(um(`SELECT id FROM agendamentos WHERE inicio='2026-05-03T13:00:00Z'`))
  const alvo = Number(um(`SELECT id FROM pacientes WHERE telefone_key='5527999990000'`))
  const antes3 = um(`SELECT count(*) FROM pacientes`)
  const c4 = await confirmarPedido(sql, { id: idEscolha, pacienteId: alvo })
  eq('confirmou', c4.ok, true)
  eq('usou o paciente indicado', Number(c4.pacienteId), alvo)
  eq('NAO criou paciente novo', um(`SELECT count(*) FROM pacientes`), antes3)

  console.log('\n--- mudarStatus libera a cadeira')
  const m1 = await mudarStatus(sql, { id: idExistente, status: 'cancelado', motivo: 'Paciente desmarcou' })
  eq('cancelou', m1.ok, true)
  eq('gravou o motivo',
    um(`SELECT cancelado_motivo FROM agendamentos WHERE id=${idExistente}`), 'Paciente desmarcou')
  const rLiberado = await criarPedido(sql, {
    ...pedidoBase, nome: 'Aproveitou', telKey: '5527933330000',
    inicio: new Date('2026-05-02T13:00:00Z'), fim: new Date('2026-05-02T14:00:00Z'),
  })
  eq('horario cancelado volta a vitrine', rLiberado.ok, true)

  console.log('\n--- criarPeloPainel com forcar')
  const semForcar = await criarPeloPainel(sql, {
    pacienteId: alvo, inicio: new Date('2026-05-03T13:00:00Z'), fim: new Date('2026-05-03T14:00:00Z'),
  })
  eq('sem forcar, respeita o confirmado', semForcar.ok, false)
  eq('com codigo de ocupado', semForcar.code, 'HORARIO_OCUPADO')

  await criarPedido(sql, {
    ...pedidoBase, nome: 'Pendente qualquer', telKey: '5527944440000',
    inicio: new Date('2026-05-04T13:00:00Z'), fim: new Date('2026-05-04T14:00:00Z'),
  })
  const comForcar = await criarPeloPainel(sql, {
    pacienteId: alvo, inicio: new Date('2026-05-04T13:00:00Z'), fim: new Date('2026-05-04T14:00:00Z'),
    forcar: true,
  })
  eq('com forcar, passa por cima do pendente', comForcar.ok, true)
  eq('e diz quantos substituiu', comForcar.substituiu, 1)
  eq('o pendente virou cancelado',
    um(`SELECT status FROM agendamentos WHERE solicitante_tel_key='5527944440000'`), 'cancelado')

  const forcarConfirmado = await criarPeloPainel(sql, {
    pacienteId: alvo, inicio: new Date('2026-05-04T13:00:00Z'), fim: new Date('2026-05-04T14:00:00Z'),
    forcar: true,
  })
  eq('mas forcar NUNCA passa por cima de confirmado', forcarConfirmado.ok, false)

  console.log('\n--- registrarAtendimento')
  const at = await registrarAtendimento(sql, {
    id: idEscolha, procedimentoRealizado: 'Profilaxia', regiao: 'arcada superior',
    proximosPassos: 'Retorno em 6 meses', retornoSemanas: 26, marcarRealizado: true,
  })
  eq('registrou', at.ok, true)
  eq('virou realizado', um(`SELECT status FROM agendamentos WHERE id=${idEscolha}`), 'realizado')
  eq('guardou o proximo passo',
    um(`SELECT proximos_passos FROM agendamentos WHERE id=${idEscolha}`), 'Retorno em 6 meses')

  console.log('\n--- varredura preguicosa de pendente vencido')
  psql(`INSERT INTO agendamentos (solicitante_nome, inicio, fim, status, expira_em)
        VALUES ('Fantasma','2026-06-01T13:00:00Z','2026-06-01T14:00:00Z','pendente', NOW() - INTERVAL '1 hour')`)
  recusa('pendente vencido ainda prende', () => psql(`
    INSERT INTO agendamentos (solicitante_nome, inicio, fim, status)
    VALUES ('Real','2026-06-01T13:00:00Z','2026-06-01T14:00:00Z','pendente')`), '23P01')
  psql(`UPDATE agendamentos SET status='expirado' WHERE status='pendente' AND expira_em < NOW()`)
  psql(`INSERT INTO agendamentos (solicitante_nome, inicio, fim, status)
        VALUES ('Real','2026-06-01T13:00:00Z','2026-06-01T14:00:00Z','pendente')`)
  eq('depois da varredura o horario volta',
    um(`SELECT count(*) FROM agendamentos WHERE solicitante_nome='Real'`), '1')

  console.log('\n--- agrupar por dia no fuso certo')
  eq('AT TIME ZONE mantem 21:00 BRT no dia 12',
    um(`SELECT DATE('2026-03-13T00:00:00Z'::timestamptz AT TIME ZONE 'America/Sao_Paulo')`), '2026-03-12')

  console.log(`\n${falhas === 0 ? 'TUDO PASSOU' : `${falhas} FALHA(S)`}`)
} finally {
  try { docker(['rm', '-f', CONTAINER]) } catch { /* ja foi */ }
}

process.exit(falhas === 0 ? 0 : 1)

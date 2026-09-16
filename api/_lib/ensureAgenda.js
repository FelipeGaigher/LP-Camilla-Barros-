import { getDb } from './db.js'

/**
 * Guarda de schema da agenda.
 *
 * Divergencia deliberada em relacao ao ensureAdmin.js, que recria as tabelas do
 * CMS a cada cold start. Aqui a escolha e outra, por dois motivos:
 *
 * 1. ensureAdmin roda no topo de TODO handler, inclusive o /api/sections que
 *    serve a home. Acrescentar as sete tabelas da agenda ali sobe o cold start
 *    do site inteiro pra proteger duas rotas.
 *
 * 2. Recriar sozinho esconde o erro. Se o handler apontar pro banco errado, um
 *    ensureAdmin devolve uma agenda vazia que parece funcionar — e a Camilla so
 *    descobre quando a paciente reclamar que o horario sumiu. Um erro claro na
 *    primeira chamada e melhor que um banco fantasma.
 *
 * Entao aqui e so conferencia: uma consulta barata, cacheada em memoria, que
 * falha alto com instrucao do que fazer. A criacao continua sendo da migration,
 * que e o historico versionado.
 */

const TABELAS = [
  'acesso_log', 'agenda_bloqueios', 'agenda_config', 'agenda_horarios',
  'agenda_procedimentos', 'agendamentos', 'funil_eventos', 'pacientes',
]

export class AgendaNaoInstalada extends Error {
  constructor(faltando) {
    super(
      `A agenda nao esta instalada neste banco. Faltam: ${faltando.join(', ')}. ` +
        'Rode `npm run migrate` apontando para o banco correto.'
    )
    this.name = 'AgendaNaoInstalada'
    this.code = 'AGENDA_NAO_INSTALADA'
    this.faltando = faltando
  }
}

let verificado = false

export async function ensureAgenda() {
  if (verificado) return
  const sql = getDb()

  // Lista literal de proposito: sem parametro, o comportamento nao depende de
  // como o driver serializa array.
  const rows = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'acesso_log', 'agenda_bloqueios', 'agenda_config', 'agenda_horarios',
        'agenda_procedimentos', 'agendamentos', 'funil_eventos', 'pacientes'
      )
  `

  const presentes = new Set(rows.map((r) => r.tablename))
  const faltando = TABELAS.filter((t) => !presentes.has(t))
  if (faltando.length > 0) throw new AgendaNaoInstalada(faltando)

  verificado = true
}

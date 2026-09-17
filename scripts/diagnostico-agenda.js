/**
 * DIAGNOSTICO DA AGENDA — leitura apenas, nao escreve nada.
 *
 * Existe porque `GET /api/agenda?action=dias` responde `aberto:false` por dois
 * motivos diferentes e indistinguiveis de fora (api/agenda.js:137):
 *
 *   a) nao existe linha em `agenda_config`, ou `publico_ativo` esta falso
 *   b) existe config ligada, mas `agenda_horarios` esta vazia
 *
 * A diferenca importa: no caso (b), ligar `publico_ativo` faz o bloco de
 * escolha de horario aparecer no site sem nenhum horario dentro, que e pior do
 * que continuar escondido.
 *
 * Uso: node scripts/diagnostico-agenda.js
 */

import dotenv from 'dotenv'
import { getDb } from '../api/_lib/db.js'

dotenv.config({ path: '.env.local' })
dotenv.config()

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

/** A grade que 003_agenda.js semeia quando a tabela nasce vazia. */
const GRADE_PADRAO = [1, 2, 3, 4, 5].flatMap((dia) => [
  { dia_semana: dia, abre_min: 480, fecha_min: 720 },
  { dia_semana: dia, abre_min: 840, fecha_min: 1080 },
])

const gradePadrao = (faixas) => {
  if (faixas.length !== GRADE_PADRAO.length) return false
  const chave = (f) => `${Number(f.dia_semana)}-${Number(f.abre_min)}-${Number(f.fecha_min)}`
  const atual = faixas.map(chave).sort()
  const padrao = GRADE_PADRAO.map(chave).sort()
  return atual.every((v, i) => v === padrao[i])
}

async function run() {
  const sql = getDb()

  const [config] = await sql`SELECT * FROM agenda_config LIMIT 1`
  const horarios = await sql`SELECT * FROM agenda_horarios ORDER BY dia_semana, abre_min`
  const bloqueios = await sql`SELECT COUNT(*)::int AS n FROM agenda_bloqueios`
  const procedimentos = await sql`SELECT id, nome, duracao_min, publico, ativo FROM agenda_procedimentos ORDER BY ordem, nome`
  const porStatus = await sql`SELECT status, COUNT(*)::int AS n FROM agendamentos GROUP BY status ORDER BY status`
  const [leads] = await sql`SELECT COUNT(*)::int AS n FROM leads`
  const [pacientes] = await sql`SELECT COUNT(*)::int AS n FROM pacientes`

  console.log('\n=== agenda_config ===')
  if (!config) {
    console.log('  NENHUMA LINHA — e por isso que o agendamento publico esta fechado.')
  } else {
    for (const [k, v] of Object.entries(config)) console.log(`  ${k}: ${JSON.stringify(v)}`)
  }

  console.log('\n=== agenda_horarios ===')
  if (!horarios.length) {
    console.log('  NENHUMA LINHA — sem faixa de atendimento nao existe horario para oferecer.')
  } else {
    // abre_min/fecha_min sao minutos desde a meia-noite, nao horario.
    const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
    for (const h of horarios) {
      const inativo = h.ativo === false ? '  (inativo)' : ''
      console.log(`  ${DIAS[h.dia_semana] ?? h.dia_semana}: ${hhmm(h.abre_min)} - ${hhmm(h.fecha_min)}${inativo}`)
    }
  }

  console.log(`\n=== agenda_bloqueios ===\n  ${bloqueios[0].n} registro(s)`)

  console.log('\n=== procedimentos ===')
  for (const p of procedimentos) {
    const marcas = [p.publico ? 'publico' : 'interno', p.ativo === false ? 'inativo' : null].filter(Boolean)
    console.log(`  #${p.id} ${p.nome} — ${p.duracao_min}min (${marcas.join(', ')})`)
  }

  console.log('\n=== agendamentos ===')
  console.log(porStatus.length ? porStatus.map((r) => `  ${r.status}: ${r.n}`).join('\n') : '  nenhum')

  console.log(`\n=== outros ===\n  leads: ${leads.n}\n  pacientes: ${pacientes.n}`)

  // Veredito: reproduz a regra de api/agenda.js:137 e o que vem depois dela.
  console.log('\n=== veredito ===')
  if (!config) {
    console.log('  FECHADO porque nao ha linha em agenda_config.')
  } else if (!config.publico_ativo) {
    console.log('  FECHADO porque agenda_config.publico_ativo = false.')
  } else {
    console.log('  Config ligada. O bloco de horario deveria aparecer no site.')
  }
  if (!horarios.length) {
    console.log('  ATENCAO: sem faixa em agenda_horarios, ligar a config faz o bloco')
    console.log('  aparecer vazio no site. Cadastrar a grade ANTES de ligar.')
  } else if (gradePadrao(horarios)) {
    // 003_agenda.js:260-266 semeia seg-sex 08:00-12:00 e 14:00-18:00 so para a
    // tela de configuracao nao nascer vazia. Enquanto publico_ativo for false
    // isso nao vaza; ligar sem revisar publica horario que o sistema inventou.
    console.log('  ATENCAO: a grade e IDENTICA ao padrao semeado pela migration 003')
    console.log('  (seg-sex, 08:00-12:00 e 14:00-18:00). Nao ha sinal de que a Camilla')
    console.log('  tenha confirmado esses horarios. Ligar agora publica um horario que')
    console.log('  o sistema chutou. Confirmar a grade real com ela antes.')
  }
  console.log('')
}

run().catch((err) => {
  console.error('Falha no diagnostico:', err)
  process.exit(1)
})

/**
 * Teste da geracao de horarios. `npm run test:slots`.
 *
 * So a conta pura: montarJanela, slotsDoDia e validarInicio nao tocam o banco,
 * e sao exatamente onde um erro passa despercebido — slot que aparece no dia
 * errado, horario que some, almoco que nao bloqueia.
 *
 * `agora` e sempre fixo. Teste de agenda que depende do relogio da maquina
 * passa hoje e quebra na terca.
 */
import {
  montarJanela, diasDaJanela, slotsDoDia, formatarSlot, validarInicio,
} from '../api/_lib/slots.js'
import { brtToInstant, brtDateKey } from '../api/_lib/brt.js'

let falhas = 0
function eq(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas += 1
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}` +
    (ok ? '' : `\n      obtido:   ${JSON.stringify(obtido)}\n      esperado: ${JSON.stringify(esperado)}`))
}

// 12/03/2026 e uma quinta-feira (diaSemana 4), conferido em test-brt.
const QUINTA = '2026-03-12'
const AGORA = brtToInstant(2026, 3, 1, 9 * 60) // 01/03/2026 09:00 BRT

const CONFIG = { grade_min: 30, buffer_min: 0, antecedencia_horas: 0, janela_dias: 45 }
const MANHA = [{ dia_semana: 4, abre_min: 480, fecha_min: 720, ativo: true }] // 08:00-12:00
const horas = (slots) => slots.map((s) => formatarSlot(s).hora)
const instante = (h, m = 0) => brtToInstant(2026, 3, 12, h * 60 + m)

console.log('--- grade basica')
eq('consulta de 60min em 08:00-12:00, grade de 30',
  horas(slotsDoDia({ dataKey: QUINTA, faixas: MANHA, config: CONFIG, duracaoMin: 60, agora: AGORA })),
  ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'])

eq('consulta de 90min nao cabe depois das 10:30',
  horas(slotsDoDia({ dataKey: QUINTA, faixas: MANHA, config: CONFIG, duracaoMin: 90, agora: AGORA })),
  ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'])

eq('grade de 60 anda de hora em hora',
  horas(slotsDoDia({ dataKey: QUINTA, faixas: MANHA, config: { ...CONFIG, grade_min: 60 }, duracaoMin: 60, agora: AGORA })),
  ['08:00', '09:00', '10:00', '11:00'])

console.log('\n--- dia sem atendimento')
eq('sabado nao tem faixa, nao tem horario',
  slotsDoDia({ dataKey: '2026-03-14', faixas: MANHA, config: CONFIG, duracaoMin: 60, agora: AGORA }).length, 0)
eq('faixa desativada nao gera horario',
  slotsDoDia({ dataKey: QUINTA, faixas: [{ ...MANHA[0], ativo: false }], config: CONFIG, duracaoMin: 60, agora: AGORA }).length, 0)

console.log('\n--- turno partido: o almoco e a lacuna entre as faixas')
const PARTIDO = [
  { dia_semana: 4, abre_min: 480, fecha_min: 720, ativo: true },  // 08:00-12:00
  { dia_semana: 4, abre_min: 840, fecha_min: 1080, ativo: true }, // 14:00-18:00
]
eq('nada entre 12:00 e 14:00',
  horas(slotsDoDia({ dataKey: QUINTA, faixas: PARTIDO, config: { ...CONFIG, grade_min: 60 }, duracaoMin: 60, agora: AGORA })),
  ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'])

console.log('\n--- faixa duplicada na configuracao nao duplica horario')
eq('mesma faixa duas vezes gera a mesma lista',
  horas(slotsDoDia({ dataKey: QUINTA, faixas: [...MANHA, ...MANHA], config: { ...CONFIG, grade_min: 60 }, duracaoMin: 60, agora: AGORA })),
  ['08:00', '09:00', '10:00', '11:00'])

console.log('\n--- horario ocupado')
const ocupado = [{ inicio: instante(9), fim: instante(10) }]
eq('some so o que colide com 09:00-10:00',
  horas(slotsDoDia({ dataKey: QUINTA, faixas: MANHA, config: { ...CONFIG, grade_min: 60 }, duracaoMin: 60, ocupados: ocupado, agora: AGORA })),
  ['08:00', '10:00', '11:00'])

eq('na grade de 30 o 09:30 tambem colide',
  horas(slotsDoDia({ dataKey: QUINTA, faixas: MANHA, config: CONFIG, duracaoMin: 60, ocupados: ocupado, agora: AGORA })),
  ['08:00', '10:00', '10:30', '11:00'])

console.log('\n--- buffer entre consultas')
eq('buffer de 15min derruba tambem o slot encostado',
  horas(slotsDoDia({ dataKey: QUINTA, faixas: MANHA, config: { ...CONFIG, grade_min: 60, buffer_min: 15 }, duracaoMin: 60, ocupados: ocupado, agora: AGORA })),
  ['11:00'])

console.log('\n--- bloqueio')
eq('bloqueio das 10 as 12 tira a ponta da manha',
  horas(slotsDoDia({
    dataKey: QUINTA, faixas: MANHA, config: { ...CONFIG, grade_min: 60 }, duracaoMin: 60,
    bloqueios: [{ inicio: instante(10), fim: instante(12) }], agora: AGORA,
  })),
  ['08:00', '09:00'])

eq('bloqueio de dia inteiro zera o dia',
  slotsDoDia({
    dataKey: QUINTA, faixas: MANHA, config: CONFIG, duracaoMin: 60,
    bloqueios: [{ inicio: brtToInstant(2026, 3, 12, 0), fim: brtToInstant(2026, 3, 13, 0) }], agora: AGORA,
  }).length, 0)

console.log('\n--- antecedencia minima')
const noDia = brtToInstant(2026, 3, 12, 8 * 60) // 12/03 as 08:00 BRT
eq('com 24h de antecedencia, o proprio dia nao tem horario',
  slotsDoDia({ dataKey: QUINTA, faixas: MANHA, config: { ...CONFIG, antecedencia_horas: 24 }, duracaoMin: 60, agora: noDia }).length, 0)
eq('com 2h de antecedencia sobra o fim da manha',
  horas(slotsDoDia({ dataKey: QUINTA, faixas: MANHA, config: { ...CONFIG, grade_min: 60, antecedencia_horas: 2 }, duracaoMin: 60, agora: noDia })),
  ['10:00', '11:00'])

console.log('\n--- fuso na saida')
const primeiro = formatarSlot(slotsDoDia({ dataKey: QUINTA, faixas: MANHA, config: CONFIG, duracaoMin: 60, agora: AGORA })[0])
eq('08:00 BRT sai como 11:00Z', primeiro.inicio, '2026-03-12T11:00:00.000Z')
eq('o dia do slot e o dia BRT', primeiro.dia, QUINTA)
eq('o rotulo ja vem pronto', primeiro.rotulo, 'quinta-feira, 12 de marco, as 08:00')

console.log('\n--- janela')
eq('nunca comeca no passado', montarJanela(CONFIG, { de: '2020-01-01' }, AGORA).de, brtDateKey(AGORA))
eq('respeita janela_dias', montarJanela({ ...CONFIG, janela_dias: 10 }, {}, AGORA).ate, '2026-03-11')
eq('span maximo de 31 dias',
  montarJanela({ ...CONFIG, janela_dias: 180 }, { de: '2026-03-01', ate: '2026-08-01' }, AGORA).ate, '2026-04-01')
eq('ate antes de de nao inverte', montarJanela(CONFIG, { de: '2026-03-10', ate: '2026-03-01' }, AGORA).ate, '2026-03-10')
eq('diasDaJanela inclui as duas pontas',
  diasDaJanela({ de: '2026-03-10', ate: '2026-03-12' }), ['2026-03-10', '2026-03-11', '2026-03-12'])

console.log('\n--- validarInicio: a revalidacao do POST')
const ctx = { config: CONFIG, faixas: MANHA, agora: AGORA, duracaoMin: 60 }
eq('aceita um slot legitimo', validarInicio({ ...ctx, inicio: instante(9) }).ok, true)
eq('calcula o fim pela duracao',
  validarInicio({ ...ctx, inicio: instante(9) }).fim.toISOString(), '2026-03-12T13:00:00.000Z')
eq('recusa fora da grade (09:10)', validarInicio({ ...ctx, inicio: instante(9, 10) }).ok, false)
eq('recusa antes da abertura (07:00)', validarInicio({ ...ctx, inicio: instante(7) }).ok, false)
eq('recusa consulta que passa do fechamento (11:30 + 60min)',
  validarInicio({ ...ctx, inicio: instante(11, 30) }).ok, false)
eq('recusa sabado',
  validarInicio({ ...ctx, inicio: brtToInstant(2026, 3, 14, 9 * 60) }).ok, false)
eq('recusa dia fora da janela',
  validarInicio({ ...ctx, inicio: brtToInstant(2027, 3, 11, 9 * 60) }).ok, false)
eq('recusa passado', validarInicio({ ...ctx, inicio: brtToInstant(2026, 2, 26, 9 * 60) }).ok, false)
eq('recusa data invalida', validarInicio({ ...ctx, inicio: new Date('nao e data') }).ok, false)
eq('respeita antecedencia',
  validarInicio({ ...ctx, config: { ...CONFIG, antecedencia_horas: 24 }, inicio: instante(9), agora: noDia }).ok, false)

console.log(`\n${falhas === 0 ? 'TUDO PASSOU' : `${falhas} FALHA(S)`}`)
process.exit(falhas === 0 ? 0 : 1)

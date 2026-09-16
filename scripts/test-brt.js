/**
 * Teste do helper de fuso. `npm run test:brt`.
 *
 * Node puro, sem framework: o projeto nao tem um, e uma dependencia de teste
 * para um arquivo so nao se paga. O que se paga e o teste existir — conversao
 * de fuso erra em silencio, e o sintoma aparece no dia da consulta.
 *
 * Os casos que importam de verdade sao os da borda do dia: 21:00 em Brasilia ja
 * e o dia seguinte em UTC, e e ai que agendamento vaza para a data errada.
 */
import {
  BRT_OFFSET_MIN, brtParts, brtToInstant, brtDayStart, brtDayEnd, brtDateKey,
  brtTime, brtDataCurta, brtDataHora, brtLabel, nomeDiaSemana, somaDias,
  diffDias, horaParaMinutos, minutosParaHora, mesmoDiaBRT, matrizDoMes, sobrepoe,
} from '../api/_lib/brt.js'

let falhas = 0

function eq(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas += 1
  console.log(
    `${ok ? 'ok   ' : 'FALHA'} ${nome}` +
      (ok ? '' : `\n      obtido:   ${JSON.stringify(obtido)}\n      esperado: ${JSON.stringify(esperado)}`)
  )
}

console.log('--- offset')
eq('offset e -180', BRT_OFFSET_MIN, -180)

console.log('\n--- parede BRT <-> instante')
eq('08:00 BRT vira 11:00Z', brtToInstant(2026, 3, 12, 8 * 60).toISOString(), '2026-03-12T11:00:00.000Z')
eq('14:00 BRT vira 17:00Z', brtToInstant(2026, 3, 12, 14 * 60).toISOString(), '2026-03-12T17:00:00.000Z')
eq('00:00 BRT vira 03:00Z', brtDayStart('2026-03-12').toISOString(), '2026-03-12T03:00:00.000Z')
eq('fim do dia e 03:00Z do dia seguinte', brtDayEnd('2026-03-12').toISOString(), '2026-03-13T03:00:00.000Z')

console.log('\n--- borda do dia')
eq('21:00 BRT ainda e dia 12', brtDateKey('2026-03-13T00:00:00.000Z'), '2026-03-12')
eq('21:00 BRT le 21:00', brtTime('2026-03-13T00:00:00.000Z'), '21:00')
eq('02:00Z ainda e dia 11 em BRT', brtDateKey('2026-03-12T02:00:00.000Z'), '2026-03-11')
eq('23:00 BRT de 31/12 continua em 2026', brtDateKey('2027-01-01T02:00:00.000Z'), '2026-12-31')

console.log('\n--- partes')
eq('partes de 14:30 BRT', brtParts('2026-03-12T17:30:00.000Z'), {
  ano: 2026, mes: 3, dia: 12, hora: 14, min: 30, diaSemana: 4, minutosDoDia: 870,
})

console.log('\n--- dia da semana, conferido contra o proprio Date')
for (const [a, m, d] of [[2026, 3, 12], [2026, 9, 16], [2027, 1, 1], [2026, 2, 28]]) {
  const verdade = new Date(Date.UTC(a, m - 1, d)).getUTCDay()
  eq(`${d}/${m}/${a} -> ${nomeDiaSemana(verdade)}`, brtParts(brtToInstant(a, m, d, 720)).diaSemana, verdade)
}

console.log('\n--- formatacao')
eq('data curta', brtDataCurta('2026-03-12T17:00:00.000Z'), '12/03/2026')
eq('data e hora', brtDataHora('2026-03-12T17:00:00.000Z'), '12/03/2026 as 14:00')
eq('rotulo por extenso', brtLabel('2026-03-12T17:00:00.000Z'), 'quinta-feira, 12 de marco, as 14:00')
eq('rotulo sem hora', brtLabel('2026-03-12T17:00:00.000Z', { comHora: false }), 'quinta-feira, 12 de marco')

console.log('\n--- aritmetica de calendario')
eq('vira o ano', somaDias('2026-12-31', 1), '2027-01-01')
eq('volta o ano', somaDias('2027-01-01', -1), '2026-12-31')
eq('bissexto 2028', somaDias('2028-02-28', 1), '2028-02-29')
eq('nao bissexto 2026', somaDias('2026-02-28', 1), '2026-03-01')
eq('diff de 45 dias', diffDias('2026-03-12', '2026-04-26'), 45)
eq('mesmo dia', mesmoDiaBRT('2026-03-12T11:00:00Z', '2026-03-12T23:59:00Z'), true)
eq('dia diferente na borda', mesmoDiaBRT('2026-03-13T02:00:00Z', '2026-03-13T04:00:00Z'), false)

console.log('\n--- ida e volta de dataKey em 400 dias seguidos')
let chave = '2026-01-01'
let quebrou = null
for (let i = 0; i < 400; i += 1) {
  if (brtDateKey(brtDayStart(chave)) !== chave) { quebrou = chave; break }
  chave = somaDias(chave, 1)
}
eq('nenhuma dataKey se perde', quebrou, null)

console.log('\n--- hora <-> minutos')
eq('08:30 -> 510', horaParaMinutos('08:30'), 510)
eq('510 -> 08:30', minutosParaHora(510), '08:30')
eq('24:00 aceito como fim de faixa', horaParaMinutos('24:00'), 1440)
eq('hora invalida vira null', horaParaMinutos('9h'), null)
eq('minuto invalido vira null', horaParaMinutos('08:99'), null)

console.log('\n--- sobreposicao, semantica [inicio, fim)')
const em = (h) => brtToInstant(2026, 3, 12, h * 60)
eq('encostar nao sobrepoe', sobrepoe(em(8), em(9), em(9), em(10)), false)
eq('invadir sobrepoe', sobrepoe(em(8), em(9.5), em(9), em(10)), true)
eq('conter sobrepoe', sobrepoe(em(8), em(12), em(9), em(10)), true)
eq('disjunto nao sobrepoe', sobrepoe(em(8), em(9), em(14), em(15)), false)

console.log('\n--- matriz do mes')
const marco = matrizDoMes(2026, 3)
eq('6 semanas', marco.length, 6)
eq('7 dias por semana', marco.every((s) => s.length === 7), true)
eq('contem o dia 1', marco.flat().includes('2026-03-01'), true)
eq('contem o dia 31', marco.flat().includes('2026-03-31'), true)
eq('dias sequenciais', marco.flat().every((d, i, a) => i === 0 || d === somaDias(a[i - 1], 1)), true)

console.log('\n--- entrada invalida nao explode')
eq('null', brtParts(null), null)
eq('string vazia', brtDateKey(''), '')
eq('lixo', brtDateKey('nao e data'), '')
eq('dataKey malformada', brtDayStart('12/03/2026'), null)

console.log(`\n${falhas === 0 ? 'TUDO PASSOU' : `${falhas} FALHA(S)`}`)
process.exit(falhas === 0 ? 0 : 1)

/**
 * Horario de Brasilia no client.
 *
 * Nao ha codigo aqui de proposito: a fonte e api/_lib/brt.js, e as duas metades
 * precisam calcular igual. Servidor gera o slot, client mostra o slot — se as
 * contas divergirem, a paciente agenda num horario e a Camilla ve outro, e o
 * erro so aparece no dia. Re-export mantem uma implementacao so.
 *
 * O arquivo de origem e ESM puro, sem nenhum import de node, entao o Vite o
 * empacota normalmente. Precedente do caminho inverso: scripts/seed.js importa
 * client/src/data/defaults.js.
 */
export * from '../../../api/_lib/brt.js'

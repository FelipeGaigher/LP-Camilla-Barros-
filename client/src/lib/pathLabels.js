import { SCHEMA } from '../admin/schema'

/**
 * Rotulo legivel para um caminho do CMS, derivado do SCHEMA.
 *
 * No projeto do NovaES essa lista e mantida a mao, com uma linha por campo.
 * Aqui ela sai do proprio schema, que ja descreve todos os campos: campo novo
 * no schema ja nasce com rotulo, e nada fica desatualizado silenciosamente.
 *
 *   'hero.title'             -> 'Topo do site, Titulo, primeira linha'
 *   'tratamentos.items.2.summary' -> 'Tratamentos, Cards 3, Resumo'
 */

const cache = new Map()

function walk(campos, segmentos, trilha) {
  if (segmentos.length === 0) return trilha

  const [atual, ...resto] = segmentos
  const def = campos?.find((f) => f.key === atual)
  if (!def) return trilha

  // Lista: o proximo segmento e o indice do item
  if (def.type === 'list') {
    const [indice, ...depois] = resto
    const numero = Number.isNaN(Number(indice)) ? indice : Number(indice) + 1
    const novaTrilha = [...trilha, `${def.label} ${numero}`]
    return walk(def.item, depois, novaTrilha)
  }

  if (def.type === 'group') {
    return walk(def.fields, resto, [...trilha, def.label])
  }

  return [...trilha, def.label]
}

export function labelForPath(path) {
  if (!path) return ''
  if (cache.has(path)) return cache.get(path)

  const [secao, ...resto] = path.split('.')
  const schema = SCHEMA[secao]
  const trilha = schema ? walk(schema.fields, resto, [schema.label]) : [secao, ...resto]
  const label = trilha.join(', ')

  cache.set(path, label)
  return label
}

/** Nome da secao a que o caminho pertence. */
export function sectionForPath(path) {
  const secao = String(path || '').split('.')[0]
  return SCHEMA[secao]?.label || secao
}

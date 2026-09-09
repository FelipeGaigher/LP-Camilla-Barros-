/**
 * Acesso imutavel a objetos por caminho em dot notation.
 * O primeiro segmento do caminho e sempre a secao do CMS.
 *   getAt(data, 'hero.title')
 *   getAt(data, 'tratamentos.items.0.summary')
 */

export function splitPath(path) {
  const keys = path.split('.')
  return { head: keys[0], rest: keys.slice(1).join('.') }
}

export function getAt(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

export function setAt(obj, path, value) {
  const keys = path.split('.')
  const lastKey = keys.pop()
  const next = Array.isArray(obj) ? [...(obj || [])] : { ...(obj || {}) }
  const cursor = keys.reduce((acc, key) => {
    const current = acc[key]
    const cloned = Array.isArray(current) ? [...current] : { ...(current || {}) }
    acc[key] = cloned
    return cloned
  }, next)
  cursor[lastKey] = value
  return next
}

/** Aplica { 'hero.title': 'X', 'hero.subtitle': 'Y' } de uma vez. */
export function applyPatches(obj, patches) {
  return Object.entries(patches).reduce((acc, [path, value]) => setAt(acc, path, value), obj)
}

/**
 * Agrupa patches pela secao (primeiro segmento).
 * { 'hero.title': 1, 'faq.items.0.q': 2 } -> { hero: { title: 1 }, faq: { 'items.0.q': 2 } }
 */
export function groupBySection(patches) {
  return Object.entries(patches).reduce((acc, [fullPath, value]) => {
    const { head, rest } = splitPath(fullPath)
    const bucket = acc[head] ?? {}
    bucket[rest] = value
    acc[head] = bucket
    return acc
  }, {})
}

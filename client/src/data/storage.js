const STORAGE_KEY = 'camilla_cms'

// Fallback em memoria quando o localStorage nao esta disponivel ou esta cheio
let memoryCache = null

export function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return memoryCache || {}
}

function stripHeavy(obj) {
  if (typeof obj === 'string') {
    return obj.startsWith('data:') ? '' : obj
  }
  if (Array.isArray(obj)) return obj.map(stripHeavy)
  if (obj && typeof obj === 'object') {
    const out = {}
    for (const k of Object.keys(obj)) out[k] = stripHeavy(obj[k])
    return out
  }
  return obj
}

export function saveAll(data) {
  memoryCache = data
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripHeavy(data)))
    return true
  } catch {
    return false
  }
}

export function saveSection(key, data) {
  const all = loadAll()
  all[key] = data
  return saveAll(all)
}

export function clearSection(key) {
  const all = loadAll()
  delete all[key]
  saveAll(all)
}

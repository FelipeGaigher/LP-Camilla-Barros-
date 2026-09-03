const API_BASE = '/api'
const TOKEN_KEY = 'camilla_token'

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}
export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
}
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

export async function fetchAllSections({ bustCache = false } = {}) {
  try {
    const url = bustCache ? `${API_BASE}/sections?_t=${Date.now()}` : `${API_BASE}/sections`
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function saveSection(key, data) {
  try {
    const res = await fetch(`${API_BASE}/sections/${key}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ data }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function resetSection(key) {
  try {
    const res = await fetch(`${API_BASE}/sections/${key}`, { method: 'DELETE', headers: authHeaders() })
    return res.ok
  } catch {
    return false
  }
}

export async function loginApi(username, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    return await res.json()
  } catch {
    return { ok: false, error: 'Servidor indisponivel' }
  }
}

export async function logoutApi() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: authHeaders() })
  } catch {}
}

export async function changePasswordApi(currentPassword, newPassword) {
  try {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    return await res.json()
  } catch {
    return { ok: false, error: 'Servidor indisponivel' }
  }
}

/**
 * Envia um File (imagem ou video) direto para o servidor.
 * Retorna a URL publica (/uploads/...).
 */
export async function uploadMedia(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/media?name=${encodeURIComponent(file.name)}`)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText)
        if (xhr.status === 200 && json.url) resolve(json.url)
        else reject(new Error(json.error || 'Falha no upload'))
      } catch {
        reject(new Error('Falha no upload'))
      }
    }
    xhr.onerror = () => reject(new Error('Falha de rede no upload'))
    xhr.send(file)
  })
}

export async function listMedia() {
  try {
    const res = await fetch(`${API_BASE}/media`, { headers: authHeaders() })
    if (!res.ok) return []
    const json = await res.json()
    return json.files || []
  } catch {
    return []
  }
}

export async function deleteMedia(name) {
  try {
    await fetch(`${API_BASE}/media/${encodeURIComponent(name)}`, { method: 'DELETE', headers: authHeaders() })
    return true
  } catch {
    return false
  }
}

export async function sendLead(payload) {
  try {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return { ok: false, error: 'Servidor indisponivel' }
  }
}

export async function fetchLeads() {
  try {
    const res = await fetch(`${API_BASE}/leads`, { headers: authHeaders() })
    if (!res.ok) return []
    const json = await res.json()
    return json.leads || []
  } catch {
    return []
  }
}

export async function deleteLead(id) {
  try {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({ id }),
    })
    return res.ok
  } catch {
    return false
  }
}

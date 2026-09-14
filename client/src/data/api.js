import { upload } from '@vercel/blob/client'

const API_BASE = '/api'

// A sessao vive num cookie httpOnly: o JavaScript nao le e nao escreve o token.
// Em dev o Vite faz proxy de /api, entao continua sendo mesma origem.
const withCreds = { credentials: 'same-origin' }
const jsonHeaders = { 'Content-Type': 'application/json' }

async function post(url, body) {
  try {
    const res = await fetch(url, {
      ...withCreds,
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(body || {}),
    })
    return await res.json()
  } catch {
    return { ok: false, error: 'Servidor indisponivel' }
  }
}

// ---------------------------------------------------------------- secoes

export async function fetchAllSections({ bustCache = false } = {}) {
  try {
    const url = bustCache ? `${API_BASE}/sections?_t=${Date.now()}` : `${API_BASE}/sections`
    const res = await fetch(url, withCreds)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function saveSection(key, data) {
  try {
    const res = await fetch(`${API_BASE}/sections?key=${encodeURIComponent(key)}`, {
      ...withCreds,
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ data }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function resetSection(key) {
  try {
    const res = await fetch(`${API_BASE}/sections?key=${encodeURIComponent(key)}`, {
      ...withCreds,
      method: 'DELETE',
    })
    return res.ok
  } catch {
    return false
  }
}

// ------------------------------------------------------------------ auth

export async function loginApi(username, password) {
  return post(`${API_BASE}/auth?action=login`, { username, password })
}

export async function logoutApi() {
  try {
    await fetch(`${API_BASE}/auth?action=logout`, { ...withCreds, method: 'POST' })
  } catch {}
}

/** Quem esta logado, segundo o servidor. Null quando nao ha sessao valida. */
export async function fetchMe() {
  try {
    const res = await fetch(`${API_BASE}/auth?action=me`, withCreds)
    if (!res.ok) return null
    const json = await res.json()
    return json?.ok ? json : null
  } catch {
    return null
  }
}

export async function changePasswordApi(currentPassword, newPassword) {
  return post(`${API_BASE}/auth?action=change-password`, { currentPassword, newPassword })
}

export async function forgotPasswordApi(email) {
  return post(`${API_BASE}/auth?action=forgot-password`, { email })
}

export async function resetPasswordApi(token, newPassword) {
  return post(`${API_BASE}/auth?action=reset-password`, { token, newPassword })
}

// ----------------------------------------------------------------- midia

// Acima disso o upload vai em partes paralelas, com retentativa por parte.
// Numa conexao domestica, um video de 100 MB numa requisicao unica cai no meio
// e recomeca do zero.
const MULTIPART_ACIMA_DE = 10 * 1024 * 1024

/**
 * Sobe um arquivo direto pro Vercel Blob.
 *
 * O arquivo nao passa pela funcao serverless — ela so assina o token. Por isso
 * o video da Camilla cabe: o limite de 4,5 MB de corpo nao se aplica.
 */
export async function uploadMedia(file, onProgress) {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: `${API_BASE}/media`,
    multipart: file.size > MULTIPART_ACIMA_DE,
    onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
  })
  return blob.url
}

export async function listMedia() {
  try {
    const res = await fetch(`${API_BASE}/media`, withCreds)
    if (!res.ok) return []
    const json = await res.json()
    return json.files || []
  } catch {
    return []
  }
}

export async function deleteMedia(url) {
  try {
    await fetch(`${API_BASE}/media?url=${encodeURIComponent(url)}`, { ...withCreds, method: 'DELETE' })
    return true
  } catch {
    return false
  }
}

// ----------------------------------------------------------------- leads

export async function sendLead(payload) {
  return post(`${API_BASE}/leads`, payload)
}

export async function fetchLeads() {
  try {
    const res = await fetch(`${API_BASE}/leads`, withCreds)
    if (!res.ok) return []
    const json = await res.json()
    return json.leads || []
  } catch {
    return []
  }
}

export async function deleteLead(id) {
  try {
    const res = await fetch(`${API_BASE}/leads?id=${encodeURIComponent(id)}`, {
      ...withCreds,
      method: 'DELETE',
    })
    return res.ok
  } catch {
    return false
  }
}

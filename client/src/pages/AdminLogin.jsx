import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/admin.css'

export default function AdminLogin() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ user: '', pass: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/admin" replace />

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await login(form.user, form.pass)
    setLoading(false)
    if (res.ok) navigate('/admin', { replace: true })
    else setError(res.error)
  }

  return (
    <main className="a-login">
      <form className="a-login__card" onSubmit={submit}>
        <h1>Painel do site</h1>
        <p className="a-hint">Entre para editar o conteudo.</p>

        <div className="a-field">
          <label htmlFor="u">Usuario</label>
          <input id="u" value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} autoComplete="username" autoFocus />
        </div>
        <div className="a-field">
          <label htmlFor="p">Senha</label>
          <input id="p" type="password" value={form.pass} onChange={(e) => setForm({ ...form, pass: e.target.value })} autoComplete="current-password" />
        </div>

        <button className="a-btn a-btn--primary" type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        {error && <p className="a-hint a-hint--error">{error}</p>}
      </form>
    </main>
  )
}

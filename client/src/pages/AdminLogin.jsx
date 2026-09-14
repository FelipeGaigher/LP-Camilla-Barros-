import { useState } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forgotPasswordApi, resetPasswordApi } from '../data/api'
import '../styles/admin.css'

/**
 * Tres telas no mesmo lugar:
 *   login  — usuario e senha
 *   forgot — pede o e-mail e dispara o link
 *   reset  — chega por /admin/login?reset=<token>, define a senha nova
 */
export default function AdminLogin() {
  const { login, isAuthenticated, checking } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const resetToken = params.get('reset') || ''

  const [modo, setModo] = useState(resetToken ? 'reset' : 'login')

  if (checking) return <main className="a-login" />
  if (isAuthenticated && modo !== 'reset') return <Navigate to="/admin" replace />

  const voltarAoLogin = () => {
    if (resetToken) {
      params.delete('reset')
      setParams(params, { replace: true })
    }
    setModo('login')
  }

  return (
    <main className="a-login">
      {modo === 'login' && <FormLogin onLogin={login} navigate={navigate} onForgot={() => setModo('forgot')} />}
      {modo === 'forgot' && <FormForgot onVoltar={voltarAoLogin} />}
      {modo === 'reset' && <FormReset token={resetToken} onPronto={voltarAoLogin} />}
    </main>
  )
}

function FormLogin({ onLogin, navigate, onForgot }) {
  const [form, setForm] = useState({ user: '', pass: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await onLogin(form.user, form.pass)
    setLoading(false)
    if (res.ok) navigate('/admin', { replace: true })
    else setError(res.error)
  }

  return (
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

      <button type="button" className="a-login__alt" onClick={onForgot}>
        Esqueci minha senha
      </button>
    </form>
  )
}

function FormForgot({ onVoltar }) {
  const [email, setEmail] = useState('')
  const [aviso, setAviso] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    const res = await forgotPasswordApi(email)
    setLoading(false)
    // A resposta e sempre a mesma, exista o e-mail ou nao: responder diferente
    // transformaria a tela num verificador de cadastro.
    setAviso(res?.message || 'Se o e-mail estiver cadastrado, o link chega em instantes.')
  }

  return (
    <form className="a-login__card" onSubmit={submit}>
      <h1>Recuperar senha</h1>
      <p className="a-hint">Informe o e-mail do painel. Enviamos um link que vale por 1 hora.</p>

      <div className="a-field">
        <label htmlFor="e">E-mail</label>
        <input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
      </div>

      <button className="a-btn a-btn--primary" type="submit" disabled={loading || !email}>
        {loading ? 'Enviando...' : 'Enviar o link'}
      </button>

      {aviso && <p className="a-hint a-hint--ok">{aviso}</p>}

      <button type="button" className="a-login__alt" onClick={onVoltar}>
        Voltar para o login
      </button>
    </form>
  )
}

function FormReset({ token, onPronto }) {
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)

  const curta = senha.length > 0 && senha.length < 8
  const diferente = confirma.length > 0 && senha !== confirma

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (senha !== confirma) return setError('As duas senhas precisam ser iguais.')
    setLoading(true)
    const res = await resetPasswordApi(token, senha)
    setLoading(false)
    if (res?.ok) setOk(true)
    else setError(res?.error || 'Nao foi possivel trocar a senha.')
  }

  if (ok) {
    return (
      <div className="a-login__card">
        <h1>Senha trocada</h1>
        <p className="a-hint">Pronto. Use a senha nova para entrar no painel.</p>
        <button type="button" className="a-btn a-btn--primary" onClick={onPronto}>
          Ir para o login
        </button>
      </div>
    )
  }

  return (
    <form className="a-login__card" onSubmit={submit}>
      <h1>Nova senha</h1>
      <p className="a-hint">Escolha uma senha de pelo menos 8 caracteres.</p>

      <div className="a-field">
        <label htmlFor="s1">Nova senha</label>
        <input id="s1" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" autoFocus />
        {curta && <p className="a-hint a-hint--error">Faltam {8 - senha.length} caracteres.</p>}
      </div>
      <div className="a-field">
        <label htmlFor="s2">Repita a senha</label>
        <input id="s2" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" />
        {diferente && <p className="a-hint a-hint--error">As duas senhas estao diferentes.</p>}
      </div>

      <button className="a-btn a-btn--primary" type="submit" disabled={loading || senha.length < 8 || senha !== confirma}>
        {loading ? 'Salvando...' : 'Salvar a senha'}
      </button>

      {error && <p className="a-hint a-hint--error">{error}</p>}

      <button type="button" className="a-login__alt" onClick={onPronto}>
        Voltar para o login
      </button>
    </form>
  )
}

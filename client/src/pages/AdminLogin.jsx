import { useId, useState } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forgotPasswordApi, resetPasswordApi } from '../data/api'
import { IconeOlho, IconeOlhoRiscado } from '../admin/ui/Icones'
import '../styles/admin.css'

/**
 * Campo de senha com o olho de ver.
 *
 * Trocar `type` entre password e text mantem a aparencia: o admin.css estiliza
 * por atributo e os dois tipos estao na lista de seletores.
 *
 * O botao nasce fora da ordem do Tab. Quem navega por teclado quer sair da
 * senha direto para o Entrar; um passo extra num botao decorativo atrapalha
 * mais do que ajuda, e o campo continua acessivel pelo mouse e pelo toque.
 */
function CampoSenha({ label, valor, onChange, autoComplete, autoFocus, children }) {
  const id = useId()
  const [visivel, setVisivel] = useState(false)

  return (
    <div className="a-field">
      <label htmlFor={id}>{label}</label>
      <div className="a-senha">
        <input
          id={id}
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="a-senha__olho"
          onClick={() => setVisivel((v) => !v)}
          tabIndex={-1}
          aria-label={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
          title={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
        >
          {visivel ? <IconeOlhoRiscado size={18} /> : <IconeOlho size={18} />}
        </button>
      </div>
      {children}
    </div>
  )
}

/**
 * Tres telas no mesmo lugar:
 *   login  — usuario e senha
 *   forgot — pede o e-mail e dispara o link
 *   reset  — chega por /gestao/login?reset=<token>, define a senha nova
 */
export default function AdminLogin() {
  const { login, isAuthenticated, checking } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const resetToken = params.get('reset') || ''

  const [modo, setModo] = useState(resetToken ? 'reset' : 'login')

  if (checking) return <main className="a-login" />
  if (isAuthenticated && modo !== 'reset') return <Navigate to="/gestao" replace />

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
    if (res.ok) navigate('/gestao', { replace: true })
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
      <CampoSenha
        label="Senha"
        valor={form.pass}
        onChange={(v) => setForm({ ...form, pass: v })}
        autoComplete="current-password"
      />

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

      <CampoSenha label="Nova senha" valor={senha} onChange={setSenha} autoComplete="new-password" autoFocus>
        {curta && <p className="a-hint a-hint--error">Faltam {8 - senha.length} caracteres.</p>}
      </CampoSenha>
      <CampoSenha label="Repita a senha" valor={confirma} onChange={setConfirma} autoComplete="new-password">
        {diferente && <p className="a-hint a-hint--error">As duas senhas estao diferentes.</p>}
      </CampoSenha>

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

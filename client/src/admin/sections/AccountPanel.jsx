import { useState } from 'react'
import { changePasswordApi } from '../../data/api'
import { useAuth } from '../../context/AuthContext'

export default function AccountPanel() {
  const { username, logout } = useAuth()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [status, setStatus] = useState({ state: 'idle', text: '' })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (form.next.length < 8) {
      setStatus({ state: 'error', text: 'A nova senha precisa ter pelo menos 8 caracteres.' })
      return
    }
    if (form.next !== form.confirm) {
      setStatus({ state: 'error', text: 'A confirmacao nao confere.' })
      return
    }
    setStatus({ state: 'sending', text: 'Salvando...' })
    const res = await changePasswordApi(form.current, form.next)
    if (res?.ok) {
      setStatus({ state: 'ok', text: 'Senha alterada. Voce vai precisar entrar de novo.' })
      setTimeout(() => logout(), 1800)
    } else {
      setStatus({ state: 'error', text: res?.error || 'Nao foi possivel alterar a senha.' })
    }
  }

  return (
    <div className="a-editor">
      <header className="a-editor__head">
        <div>
          <h1>Minha conta</h1>
          <p className="a-hint">Voce esta logada como <strong>{username}</strong>.</p>
        </div>
      </header>

      <div className="a-editor__body">
        <form className="a-form" onSubmit={submit}>
          <div className="a-field">
            <label htmlFor="cur">Senha atual</label>
            <input id="cur" type="password" value={form.current} onChange={set('current')} autoComplete="current-password" />
          </div>
          <div className="a-field">
            <label htmlFor="new">Nova senha</label>
            <input id="new" type="password" value={form.next} onChange={set('next')} autoComplete="new-password" />
          </div>
          <div className="a-field">
            <label htmlFor="conf">Confirmar nova senha</label>
            <input id="conf" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </div>
          <button className="a-btn a-btn--primary" type="submit" disabled={status.state === 'sending'}>
            Alterar senha
          </button>
          {status.text && (
            <p className={`a-hint ${status.state === 'error' ? 'a-hint--error' : ''}`}>{status.text}</p>
          )}
        </form>
      </div>
    </div>
  )
}

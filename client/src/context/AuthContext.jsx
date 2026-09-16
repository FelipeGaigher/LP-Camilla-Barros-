import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { loginApi, logoutApi, fetchMe } from '../data/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [username, setUsername] = useState('')
  // Enquanto o servidor nao responde quem esta logado, nao da pra decidir se a
  // rota /gestao redireciona. Sem isso, um F5 no painel joga a Camilla pro login.
  const [checking, setChecking] = useState(true)

  // A sessao mora num cookie httpOnly — o JavaScript nao consegue le-la.
  // Quem sabe se ha sessao valida e o servidor, entao perguntamos no boot.
  useEffect(() => {
    let vivo = true
    fetchMe()
      .then((me) => {
        if (!vivo) return
        if (me) setUsername(me.username || '')
        setChecking(false)
      })
      .catch(() => vivo && setChecking(false))
    return () => {
      vivo = false
    }
  }, [])

  const login = useCallback(async (user, pass) => {
    const res = await loginApi(user, pass)
    if (res?.ok) {
      setUsername(res.username || user)
      return { ok: true }
    }
    return { ok: false, error: res?.error || 'Nao foi possivel entrar' }
  }, [])

  const logout = useCallback(async () => {
    await logoutApi()
    setUsername('')
  }, [])

  return (
    <AuthContext.Provider value={{ username, isAuthenticated: !!username, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

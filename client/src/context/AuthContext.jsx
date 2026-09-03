import { createContext, useContext, useState, useCallback } from 'react'
import { loginApi, logoutApi, getToken, setToken, clearToken } from '../data/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [username, setUsername] = useState(() => sessionStorage.getItem('camilla_user') || '')

  const login = useCallback(async (user, pass) => {
    const res = await loginApi(user, pass)
    if (res?.ok && res.token) {
      setToken(res.token)
      sessionStorage.setItem('camilla_user', res.username || user)
      setTokenState(res.token)
      setUsername(res.username || user)
      return { ok: true }
    }
    return { ok: false, error: res?.error || 'Nao foi possivel entrar' }
  }, [])

  const logout = useCallback(async () => {
    await logoutApi()
    clearToken()
    sessionStorage.removeItem('camilla_user')
    setTokenState('')
    setUsername('')
  }, [])

  return (
    <AuthContext.Provider value={{ token, username, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

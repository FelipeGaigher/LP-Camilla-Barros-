import { Routes, Route, Navigate } from 'react-router-dom'
import { SiteDataProvider, useSiteData } from './context/SiteDataContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { EditModeProvider } from './context/EditModeContext'
import SmoothScroll from './components/SmoothScroll'
import SeoHead from './components/SeoHead'
import { Grain, LoadingScreen } from './components/Chrome'
import EditToolbar from './components/editable/EditToolbar'
import HomePage from './pages/HomePage'
import AdminLogin from './pages/AdminLogin'
import AdminPanel from './pages/AdminPanel'
import NotFound from './pages/NotFound'
import './styles/global.css'
import './styles/editmode.css'

function Shell() {
  const { data, ready } = useSiteData()
  const s = data.settings

  return (
    <>
      <SeoHead />
      <SmoothScroll enabled={s.smoothScroll} />
      <Grain enabled={s.grain} />
      <LoadingScreen enabled={s.loadingScreen && !ready} label={data.nav.logoText} />
      <EditToolbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminPanel />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

function RequireAuth({ children }) {
  const { isAuthenticated, checking } = useAuth()
  // A sessao esta num cookie httpOnly, entao so o servidor sabe se ela vale.
  // Redirecionar antes da resposta jogaria a Camilla pro login a cada F5.
  if (checking) return null
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return children
}

/**
 * `staticSections` so chega no prerender de build (client/src/entry-server.jsx),
 * com o conteudo lido do banco. No navegador vem undefined e o provider volta
 * ao caminho normal: cache local, depois API.
 */
export default function App({ staticSections }) {
  return (
    <AuthProvider>
      <SiteDataProvider staticSections={staticSections}>
        <EditModeProvider>
          <Shell />
        </EditModeProvider>
      </SiteDataProvider>
    </AuthProvider>
  )
}

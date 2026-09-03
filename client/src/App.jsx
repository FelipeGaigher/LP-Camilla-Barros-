import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SiteDataProvider, useSiteData } from './context/SiteDataContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import SmoothScroll from './components/SmoothScroll'
import SeoHead from './components/SeoHead'
import { Grain, LoadingScreen } from './components/Chrome'
import HomePage from './pages/HomePage'
import AdminLogin from './pages/AdminLogin'
import AdminPanel from './pages/AdminPanel'
import NotFound from './pages/NotFound'
import './styles/global.css'

function Shell() {
  const { data, ready } = useSiteData()
  const s = data.settings

  return (
    <>
      <SeoHead />
      <SmoothScroll enabled={s.smoothScroll} />
      <Grain enabled={s.grain} />
      <LoadingScreen enabled={s.loadingScreen && !ready} label={data.nav.logoText} />
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
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteDataProvider>
          <Shell />
        </SiteDataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

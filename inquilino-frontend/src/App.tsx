import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth }       from '@/hooks/useAuth'
import { LangProvider, useLang } from '@/i18n'
import LoginPage         from '@/pages/auth/LoginPage'
import OAuthCallbackPage from '@/pages/auth/OAuthCallbackPage'
import OnboardingPage    from '@/pages/onboarding/OnboardingPage'
import LanguageSelectPage from '@/pages/lang/LanguageSelectPage'
import HomePage          from '@/pages/home/HomePage'
import TenantProfilePage from '@/pages/tenant/TenantProfilePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const { t } = useLang()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
      {t('app.loading')}
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { hasLang } = useLang()

  // Show language selection until the user picks one
  if (!hasLang) return <LanguageSelectPage />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/onboarding"    element={
          <ProtectedRoute><OnboardingPage /></ProtectedRoute>
        } />
        <Route path="/profile"       element={
          <ProtectedRoute><TenantProfilePage /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <LangProvider>
      <AppRoutes />
    </LangProvider>
  )
}

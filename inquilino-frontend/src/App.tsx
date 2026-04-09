import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth }          from '@/hooks/useAuth'
import { LangProvider, useLang } from '@/i18n'
import LandingPage          from '@/pages/landing/LandingPage'
import PolicyPage           from '@/pages/legal/PolicyPage'
import LoginPage            from '@/pages/auth/LoginPage'
import OAuthCallbackPage    from '@/pages/auth/OAuthCallbackPage'
import OnboardingPage       from '@/pages/onboarding/OnboardingPage'
import LanguageSelectPage   from '@/pages/lang/LanguageSelectPage'
import TenantProfilePage    from '@/pages/tenant/TenantProfilePage'
import TenantMutualPage     from '@/pages/tenant/TenantMutualPage'
import ProfileListPage      from '@/pages/supervisor/ProfileListPage'
import ProfileDetailPage    from '@/pages/supervisor/ProfileDetailPage'
import SupervisorManagementPage from '@/pages/admin/SupervisorManagementPage'
import AuditLogPage         from '@/pages/admin/AuditLogPage'
import AppLayout            from '@/components/layout/AppLayout'
import { UserType }         from '@/types'
// Landlord
import RegisterLandlordPage  from '@/pages/auth/RegisterLandlordPage'
import RegisterChoicePage   from '@/pages/auth/RegisterChoicePage'
import LandlordListingsPage  from '@/pages/landlord/LandlordListingsPage'
import LandlordProfilePage   from '@/pages/landlord/LandlordProfilePage'
import ListingWizardPage     from '@/pages/landlord/ListingWizardPage'
// Supervisor listings
import ListingListPage              from '@/pages/supervisor/ListingListPage'
import ListingDetailPage            from '@/pages/supervisor/ListingDetailPage'
// Matching
import TenantMatchesPage            from '@/pages/tenant/TenantMatchesPage'
import LandlordListingMatchesPage   from '@/pages/landlord/LandlordListingMatchesPage'

// ─── Guards ───────────────────────────────────────────────────────────────────

function AuthGuard({ children }: { children: React.ReactNode }) {
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

function RoleGuard({ children, roles }: { children: React.ReactNode; roles: UserType[] }) {
  const { user, loading } = useAuth()
  const { t } = useLang()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
      {t('app.loading')}
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.userType as UserType)) return <Navigate to="/" replace />
  return <>{children}</>
}

// ─── Landing guard: shows LandingPage for unauthenticated, else redirect ──────

function PublicLandingRoute() {
  const { isAuthenticated, loading } = useAuth()
  const { t } = useLang()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
      {t('app.loading')}
    </div>
  )
  if (isAuthenticated) return <Navigate to="/profile" replace />
  return <LandingPage />
}

// ─── Routing ──────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { hasLang } = useLang()

  // Landing page is always accessible regardless of language preference.
  // It ships its own language switcher.
  if (!hasLang) {
    return (
      <Routes>
        <Route path="/"  element={<PublicLandingRoute />} />
        <Route path="*"  element={<LanguageSelectPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
        {/* Public landing */}
        <Route path="/"                  element={<PublicLandingRoute />} />

        {/* Pagine senza layout (auth, onboarding) */}
        <Route path="/login"             element={<LoginPage />} />
        <Route path="/register"          element={<RegisterChoicePage />} />
        <Route path="/register/landlord" element={<RegisterLandlordPage />} />
        {/* Legal pages — always public */}
        <Route path="/legal/privacy" element={<PolicyPage file="privacy-policy.md"       title="Privacy Policy" />} />
        <Route path="/legal/cookie"  element={<PolicyPage file="cookie-policy.md"        title="Cookie Policy" />} />
        <Route path="/legal/terms"   element={<PolicyPage file="termini-di-servizio.md"  title="Termini di Servizio" />} />
        <Route path="/auth/callback"     element={<OAuthCallbackPage />} />
        <Route path="/onboarding"        element={
          <AuthGuard><OnboardingPage /></AuthGuard>
        } />

        {/* Landlord wizard (senza AppLayout per massimizzare spazio) */}
        <Route path="/landlord/listings/new"      element={
          <AuthGuard>
            <RoleGuard roles={[UserType.LANDLORD, UserType.AGENCY, UserType.SUPERADMIN]}>
              <ListingWizardPage />
            </RoleGuard>
          </AuthGuard>
        } />
        <Route path="/landlord/listings/:id/edit" element={
          <AuthGuard>
            <RoleGuard roles={[UserType.LANDLORD, UserType.AGENCY, UserType.SUPERADMIN]}>
              <ListingWizardPage />
            </RoleGuard>
          </AuthGuard>
        } />

        {/* Tutte le pagine con AppLayout */}
        <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
          {/* Tenant */}
          <Route path="/profile" element={<TenantProfilePage />} />
          <Route path="/matches" element={<TenantMatchesPage />} />
          <Route path="/mutual"  element={<TenantMutualPage />} />

          {/* Landlord */}
          <Route path="/landlord/listings" element={
            <RoleGuard roles={[UserType.LANDLORD, UserType.AGENCY, UserType.SUPERADMIN]}>
              <LandlordListingsPage />
            </RoleGuard>
          } />
          <Route path="/landlord/listings/:listingId/matches" element={
            <RoleGuard roles={[UserType.LANDLORD, UserType.AGENCY, UserType.SUPERADMIN]}>
              <LandlordListingMatchesPage />
            </RoleGuard>
          } />
          <Route path="/landlord/profile" element={
            <RoleGuard roles={[UserType.LANDLORD, UserType.AGENCY]}>
              <LandlordProfilePage />
            </RoleGuard>
          } />

          {/* Supervisor – profili tenant */}
          <Route path="/supervisor/profiles" element={
            <RoleGuard roles={[UserType.SUPERVISOR, UserType.SUPERADMIN]}>
              <ProfileListPage />
            </RoleGuard>
          } />
          <Route path="/supervisor/profiles/:profileId" element={
            <RoleGuard roles={[UserType.SUPERVISOR, UserType.SUPERADMIN]}>
              <ProfileDetailPage />
            </RoleGuard>
          } />

          {/* Supervisor – annunci */}
          <Route path="/supervisor/listings" element={
            <RoleGuard roles={[UserType.SUPERVISOR, UserType.SUPERADMIN]}>
              <ListingListPage />
            </RoleGuard>
          } />
          <Route path="/supervisor/listings/:id" element={
            <RoleGuard roles={[UserType.SUPERVISOR, UserType.SUPERADMIN]}>
              <ListingDetailPage />
            </RoleGuard>
          } />

          {/* Admin */}
          <Route path="/admin/supervisors" element={
            <RoleGuard roles={[UserType.SUPERADMIN]}>
              <SupervisorManagementPage />
            </RoleGuard>
          } />
          <Route path="/admin/audit-log" element={
            <RoleGuard roles={[UserType.SUPERADMIN]}>
              <AuditLogPage />
            </RoleGuard>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </LangProvider>
  )
}

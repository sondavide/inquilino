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
import AuditLogPage             from '@/pages/admin/AuditLogPage'
import OnboardingConfigPage     from '@/pages/admin/OnboardingConfigPage'
import ScoringTemplatesPage     from '@/pages/admin/ScoringTemplatesPage'
import AppLayout            from '@/components/layout/AppLayout'
import { UserType }         from '@/types'
// Agency
import RegisterAgencyPage    from '@/pages/auth/RegisterAgencyPage'
import AgencyProfilePage     from '@/pages/agency/AgencyProfilePage'
import AgencyOperatorsPage   from '@/pages/agency/AgencyOperatorsPage'
import AgencyRubricaPage     from '@/pages/agency/AgencyRubricaPage'
import AgencyManagementPage  from '@/pages/admin/AgencyManagementPage'
// Landlord
import RegisterLandlordPage  from '@/pages/auth/RegisterLandlordPage'
import RegisterChoicePage   from '@/pages/auth/RegisterChoicePage'
import ForgotPasswordPage  from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage   from '@/pages/auth/ResetPasswordPage'
import LandlordListingsPage  from '@/pages/landlord/LandlordListingsPage'
import LandlordProfilePage   from '@/pages/landlord/LandlordProfilePage'
import ListingWizardPage     from '@/pages/landlord/ListingWizardPage'
// Supervisor listings
import ListingListPage              from '@/pages/supervisor/ListingListPage'
import AgencyListingListPage        from '@/pages/supervisor/AgencyListingListPage'
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

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { t } = useLang()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
      {t('app.loading')}
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.userType === UserType.TENANT && user.onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

// ─── Landing guard: shows LandingPage for unauthenticated, else redirect ──────

function PublicLandingRoute() {
  const { isAuthenticated, loading, user } = useAuth()
  const { t } = useLang()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
      {t('app.loading')}
    </div>
  )
  if (isAuthenticated && user) {
    const type = user.userType as UserType
    if (type === UserType.SUPERVISOR || type === UserType.SUPERADMIN)
      return <Navigate to="/supervisor/profiles" replace />
    if (type === UserType.LANDLORD)
      return <Navigate to="/landlord/listings" replace />
    if (type === UserType.AGENCY)
      return <Navigate to="/agency/rubrica" replace />
    if (type === UserType.AGENCY_OPERATOR)
      return <Navigate to="/agency/rubrica" replace />
    return <Navigate to="/profile" replace />
  }
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
        <Route path="/register/agency"   element={<RegisterAgencyPage />} />
        <Route path="/forgot-password"   element={<ForgotPasswordPage />} />
        <Route path="/reset-password"    element={<ResetPasswordPage />} />
        {/* Legal pages — always public */}
        <Route path="/legal/privacy" element={<PolicyPage file="privacy-policy.md"       title="Privacy Policy" />} />
        <Route path="/legal/cookie"  element={<PolicyPage file="cookie-policy.md"        title="Cookie Policy" />} />
        <Route path="/legal/terms"   element={<PolicyPage file="termini-di-servizio.md"  title="Termini di Servizio" />} />
        <Route path="/auth/callback"     element={<OAuthCallbackPage />} />
        <Route path="/onboarding"        element={
          <AuthGuard><OnboardingPage /></AuthGuard>
        } />

        {/* Landlord/Agency wizard (senza AppLayout per massimizzare spazio) */}
        <Route path="/landlord/listings/new"      element={
          <AuthGuard>
            <OnboardingGuard>
              <RoleGuard roles={[UserType.LANDLORD, UserType.AGENCY, UserType.AGENCY_OPERATOR, UserType.SUPERADMIN]}>
                <ListingWizardPage />
              </RoleGuard>
            </OnboardingGuard>
          </AuthGuard>
        } />
        <Route path="/landlord/listings/:id/edit" element={
          <AuthGuard>
            <OnboardingGuard>
              <RoleGuard roles={[UserType.LANDLORD, UserType.AGENCY, UserType.AGENCY_OPERATOR, UserType.SUPERADMIN]}>
                <ListingWizardPage />
              </RoleGuard>
            </OnboardingGuard>
          </AuthGuard>
        } />

        {/* Tutte le pagine con AppLayout */}
        <Route element={<AuthGuard><OnboardingGuard><AppLayout /></OnboardingGuard></AuthGuard>}>
          {/* Tenant */}
          <Route path="/profile" element={<TenantProfilePage />} />
          <Route path="/matches" element={<TenantMatchesPage />} />
          <Route path="/mutual"  element={<TenantMutualPage />} />

          {/* Landlord */}
          <Route path="/landlord/listings" element={
            <RoleGuard roles={[UserType.LANDLORD, UserType.AGENCY, UserType.AGENCY_OPERATOR, UserType.SUPERADMIN]}>
              <LandlordListingsPage />
            </RoleGuard>
          } />
          <Route path="/landlord/listings/:listingId/matches" element={
            <RoleGuard roles={[UserType.LANDLORD, UserType.AGENCY, UserType.AGENCY_OPERATOR, UserType.SUPERADMIN]}>
              <LandlordListingMatchesPage />
            </RoleGuard>
          } />
          <Route path="/landlord/profile" element={
            <RoleGuard roles={[UserType.LANDLORD]}>
              <LandlordProfilePage />
            </RoleGuard>
          } />

          {/* Agency */}
          <Route path="/agency/profile" element={
            <RoleGuard roles={[UserType.AGENCY]}>
              <AgencyProfilePage />
            </RoleGuard>
          } />
          <Route path="/agency/operators" element={
            <RoleGuard roles={[UserType.AGENCY]}>
              <AgencyOperatorsPage />
            </RoleGuard>
          } />
          <Route path="/agency/rubrica" element={
            <RoleGuard roles={[UserType.AGENCY, UserType.AGENCY_OPERATOR]}>
              <AgencyRubricaPage />
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

          {/* Supervisor – annunci locatori */}
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

          {/* Supervisor – annunci agenzie */}
          <Route path="/supervisor/agency-listings" element={
            <RoleGuard roles={[UserType.SUPERVISOR, UserType.SUPERADMIN]}>
              <AgencyListingListPage />
            </RoleGuard>
          } />
          <Route path="/supervisor/agency-listings/:id" element={
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
          <Route path="/admin/onboarding" element={
            <RoleGuard roles={[UserType.SUPERADMIN]}>
              <OnboardingConfigPage />
            </RoleGuard>
          } />
          <Route path="/admin/scoring-templates" element={
            <RoleGuard roles={[UserType.SUPERADMIN]}>
              <ScoringTemplatesPage />
            </RoleGuard>
          } />
          <Route path="/admin/agencies" element={
            <RoleGuard roles={[UserType.SUPERADMIN]}>
              <AgencyManagementPage />
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

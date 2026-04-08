import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { UserType } from '@/types'

// ─── Definizione menu per ruolo ───────────────────────────────────────────────

interface NavItem {
  label:  string
  icon:   string
  path:   string
  match:  string   // prefix usato per l'active state
}

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case UserType.SUPERADMIN:
      return [
        { label: 'Supervisori',   icon: '👥', path: '/admin/supervisors',    match: '/admin/supervisors' },
        { label: 'Audit Log',     icon: '📋', path: '/admin/audit-log',       match: '/admin/audit-log' },
        { label: 'Profili',       icon: '🔍', path: '/supervisor/profiles',   match: '/supervisor/profiles' },
        { label: 'Annunci',       icon: '🏠', path: '/supervisor/listings',   match: '/supervisor/listings' },
      ]
    case UserType.SUPERVISOR:
      return [
        { label: 'Profili',       icon: '👤', path: '/supervisor/profiles',   match: '/supervisor/profiles' },
        { label: 'Annunci',       icon: '🏠', path: '/supervisor/listings',   match: '/supervisor/listings' },
      ]
    case UserType.LANDLORD:
    case UserType.AGENCY:
      return [
        { label: 'Annunci',       icon: '🏠', path: '/landlord/listings',     match: '/landlord/listings' },
        { label: 'Profilo',       icon: '👤', path: '/landlord/profile',      match: '/landlord/profile' },
      ]
    default: // TENANT e altri
      return [
        { label: 'Profilo',  icon: '👤', path: '/profile', match: '/profile' },
        { label: 'Annunci',  icon: '🏡', path: '/matches', match: '/matches' },
        { label: 'Match',    icon: '💚', path: '/mutual',  match: '/mutual'  },
      ]
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case UserType.SUPERADMIN: return 'Super Admin'
    case UserType.SUPERVISOR: return 'Supervisore'
    case UserType.LANDLORD:   return 'Locatore'
    case UserType.AGENCY:     return 'Agenzia'
    default:                  return 'inquilino'
  }
}

// ─── Helpers active state ─────────────────────────────────────────────────────

function isActive(item: NavItem, pathname: string, search: string): boolean {
  if (item.path.includes('tab=documents')) return pathname === '/profile' && search.includes('tab=documents')
  if (item.path.includes('tab=areas'))     return pathname === '/profile' && search.includes('tab=areas')
  if (item.match === '/profile')           return pathname === '/' || pathname === '/profile'
  if (item.match === '/landlord/__matches__') return pathname.includes('/matches')
  // "Annunci" del locatore non deve attivarsi sulle pagine matches
  if (item.match === '/landlord/listings') return pathname.startsWith('/landlord/listings') && !pathname.includes('/matches')
  return pathname.startsWith(item.match)
}

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────

function Sidebar({ items, roleLabel, onNavigate, onLogout, user }: {
  items:      NavItem[]
  roleLabel:  string
  onNavigate: (path: string) => void
  onLogout:   () => void
  user:       { email: string; userType: string } | null
}) {
  const location = useLocation()
  const initials = user?.email.slice(0, 2).toUpperCase() ?? '??'

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-card h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 border-b">
        <span className="text-lg font-bold text-primary">{roleLabel}</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(item => {
          const active = isActive(item, location.pathname, location.search)
          return (
            <button
              key={item.match}
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left
                ${active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer: user + logout */}
      <div className="px-3 py-4 border-t space-y-2">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-muted-foreground flex-1 truncate">{user?.email}</span>
        </div>
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Esci
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── Mobile topbar ────────────────────────────────────────────────────────────

function MobileTopbar({ items, roleLabel, onNavigate, onLogout, user }: {
  items:      NavItem[]
  roleLabel:  string
  onNavigate: (path: string) => void
  onLogout:   () => void
  user:       { email: string; userType: string } | null
}) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = user?.email.slice(0, 2).toUpperCase() ?? '??'

  return (
    <>
      {/* Top strip: logo + icons */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-2 px-4 py-3 border-b bg-background/95 backdrop-blur">
        <span className="text-base font-bold text-primary flex-1">{roleLabel}</span>
        <NotificationBell />
        {/* Avatar / menu toggle */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center"
        >
          {initials}
        </button>
      </header>

      {/* Nav tabs: scrollabile orizzontalmente */}
      <nav className="md:hidden sticky top-[53px] z-20 flex border-b bg-background overflow-x-auto scrollbar-hide">
        {items.map(item => {
          const active = isActive(item, location.pathname, location.search)
          return (
            <button
              key={item.match}
              onClick={() => onNavigate(item.path)}
              className={`flex items-center gap-1.5 px-4 py-2.5 whitespace-nowrap text-xs font-medium border-b-2 transition-colors shrink-0
                ${active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Drawer overlay per logout (compare dal avatar) */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="md:hidden fixed top-0 right-0 z-50 h-full w-64 bg-card border-l shadow-xl flex flex-col">
            <div className="flex items-center gap-3 px-5 py-5 border-b">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <button onClick={() => setMenuOpen(false)}
                      className="ml-auto text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {items.map(item => {
                const active = isActive(item, location.pathname, location.search)
                return (
                  <button
                    key={item.match}
                    onClick={() => { onNavigate(item.path); setMenuOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left
                      ${active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div className="px-5 py-5 border-t">
              <button
                onClick={() => { onLogout(); setMenuOpen(false) }}
                className="w-full py-2.5 rounded-xl border text-sm font-medium text-destructive border-destructive/30 hover:bg-destructive/5 transition-colors"
              >
                Esci
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  const role     = user?.userType ?? 'TENANT'
  const items    = getNavItems(role)
  const roleLabel = getRoleLabel(role)

  const handleNavigate = (path: string) => navigate(path)

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      {/* Sidebar — solo desktop */}
      <Sidebar
        items={items}
        roleLabel={roleLabel}
        onNavigate={handleNavigate}
        onLogout={logout}
        user={user}
      />

      {/* Colonna principale */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop topbar — notification bell */}
        <header className="hidden md:flex items-center justify-end px-4 py-3 border-b bg-background/95 sticky top-0 z-20">
          <NotificationBell />
        </header>

        {/* Mobile topbar + nav tabs */}
        <MobileTopbar
          items={items}
          roleLabel={roleLabel}
          onNavigate={handleNavigate}
          onLogout={logout}
          user={user}
        />

        {/* Contenuto pagina */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

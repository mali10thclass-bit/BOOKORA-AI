import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from '@/lib/router-compat'
import {
  LayoutDashboard, CalendarDays, Users, UserCog, Sparkles,
  Settings, BarChart3, Bell, CreditCard, Bot, LogOut, Menu, X,
  Moon, Sun, Globe, Calendar,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useI18n } from '@/context/I18nContext'
import { languageNames, type Language } from '@/lib/i18n'

export function AppLayout({ children }: { children: ReactNode }) {
  const { business, membership, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { t, lang, setLang } = useI18n()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const navigate = useNavigate()

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/bookings', icon: CalendarDays, label: t('bookings') },
    { to: '/calendar', icon: Calendar, label: t('calendar') },
    { to: '/customers', icon: Users, label: t('customers') },
    { to: '/staff', icon: UserCog, label: t('staff') },
    { to: '/services', icon: Sparkles, label: t('services') },
    { to: '/analytics', icon: BarChart3, label: t('analytics') },
    { to: '/notifications', icon: Bell, label: t('notifications') },
    { to: '/ai-assistant', icon: Bot, label: t('ai_assistant') },
    { to: '/plans', icon: CreditCard, label: t('plans') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static lg:translate-x-0 z-40 w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-200`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <span className="font-bold text-lg tracking-tight">BOOKORA</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-medium">
              {membership?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{membership?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{membership?.role || 'staff'}</p>
            </div>
            <button onClick={handleSignOut} className="btn-ghost p-1.5" title={t('sign_out')}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-1.5">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-semibold text-base">{business?.name || 'BOOKORA AI'}</h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {business?.plan === 'free' ? t('free') : business?.plan === 'pro' ? t('pro') : t('ultimate')} · {business?.currency || 'USD'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="btn-ghost p-2"
                title={t('select_language')}
              >
                <Globe size={18} />
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 mt-2 w-40 card p-1 z-20 animate-fade-in">
                    {(Object.keys(languageNames) as Language[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLang(l); setLangOpen(false) }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          lang === l ? 'text-primary-600 font-medium' : ''
                        }`}
                      >
                        {languageNames[l]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Theme toggle */}
            <button onClick={toggle} className="btn-ghost p-2" title={theme === 'light' ? t('dark_mode') : t('light_mode')}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

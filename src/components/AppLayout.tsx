import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "@/lib/router-compat";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Sparkles,
  Settings,
  BarChart3,
  Bell,
  CreditCard,
  Bot,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Globe,
  Calendar,
  AlertCircle,
  CalendarPlus,
  ListPlus,
  Box,
  MessageSquare,
  BrainCircuit,
  Workflow,
  Code2,
  Gauge,
  ClipboardList,
  Gift,
} from "lucide-react";
import { Link } from "@/lib/router-compat";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useI18n } from "@/context/I18nContext";
import { languageNames, type Language } from "@/lib/i18n";

export function AppLayout({ children }: { children: ReactNode }) {
  const { business, membership, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { t, lang, setLang } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const navigate = useNavigate();

  if (!business) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle size={32} className="mx-auto mb-2 text-warning-600" />
          <p className="text-sm text-gray-600">Business data not loaded</p>
        </div>
      </div>
    );
  }

  // Grouped information architecture (Overview / Operations / Insights /
  // Growth / System) so the sidebar reads as a business tool, not a flat
  // link list. Only routes that actually exist are listed.
  const navGroups: {
    label: string;
    items: { to: string; icon: typeof Calendar; label: string; external?: boolean }[];
  }[] = [
    {
      label: "Overview",
      items: [{ to: "/", icon: LayoutDashboard, label: t("dashboard") }],
    },
    {
      label: "Operations",
      items: [
        { to: "/calendar", icon: Calendar, label: t("calendar") },
        { to: "/bookings", icon: CalendarDays, label: t("bookings") },
        { to: "/customers", icon: Users, label: t("customers") },
        { to: "/services", icon: Sparkles, label: t("services") },
        { to: "/staff", icon: UserCog, label: t("staff") },
        { to: "/resources", icon: Box, label: "Resources" },
        { to: "/waitlist", icon: ListPlus, label: "Waitlist" },
        { to: "/smart-operations", icon: Gauge, label: "Smart Operations" },\n        { to: "/business-os", icon: BriefcaseBusiness, label: "Business OS" },
        { to: "/forms", icon: ClipboardList, label: "Forms & Intake" },
        { to: "/packages", icon: Gift, label: "Packages" },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/analytics", icon: BarChart3, label: t("analytics") },
        { to: "/ai-assistant", icon: Bot, label: t("ai_assistant") },
        { to: "/ai-trainer", icon: BrainCircuit, label: "AI Trainer" },
        { to: "/automations", icon: Workflow, label: "Automations" },
        { to: "/reviews", icon: MessageSquare, label: "Reviews" },
      ],
    },
    {
      label: "Growth",
      items: [
        {
          to: `/book/${business.slug}`,
          icon: CalendarPlus,
          label: t("public_booking"),
          external: true,
        },
        { to: "/notifications", icon: Bell, label: t("notifications") },
      ],
    },
    {
      label: "System",
      items: [
        { to: "/plans", icon: CreditCard, label: t("plans") },
        { to: "/developer", icon: Code2, label: "Developer" },
        { to: "/settings", icon: Settings, label: t("settings") },
      ],
    },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth", { replace: true });
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed lg:static lg:translate-x-0 z-40 w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-200`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <span className="font-bold text-lg tracking-tight">BOOKORA</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) =>
                  item.external ? (
                    <a
                      key={item.to}
                      href={item.to}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                      <item.icon size={18} />
                      {item.label}
                    </a>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                          isActive
                            ? "bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        }`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </NavLink>
                  ),
                )}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-medium shrink-0">
              {membership?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{membership?.full_name || "User"}</p>
              <p className="text-xs text-gray-500 capitalize">{membership?.role || "staff"}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded"
              title={t("sign_out")}
              aria-label={t("sign_out")}
            >
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
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded"
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-semibold text-base">{business.name || "BOOKORA AI"}</h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {business.plan === "free"
                  ? t("free")
                  : business.plan === "pro"
                    ? t("pro")
                    : business.plan === "enterprise"
                      ? "Enterprise"
                      : t("ultimate")}{" "}
                · {business.currency || "USD"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Notifications */}
            <Link
              to="/notifications"
              className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded"
              title={t("notifications")}
              aria-label={t("notifications")}
            >
              <Bell size={18} />
            </Link>

            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded"
                title={t("select_language")}
                aria-label={t("select_language")}
                aria-expanded={langOpen}
              >
                <Globe size={18} />
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 z-20 shadow-lg">
                    {(Object.keys(languageNames) as Language[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setLang(l);
                          setLangOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          lang === l
                            ? "bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
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
            <button
              onClick={toggle}
              className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded"
              title={theme === "light" ? t("dark_mode") : t("light_mode")}
              aria-label={theme === "light" ? t("dark_mode") : t("light_mode")}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

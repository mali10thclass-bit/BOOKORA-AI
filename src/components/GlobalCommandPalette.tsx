import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@/lib/router-compat";
import {
  BarChart3,
  Bot,
  Calendar,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  UserCog,
  Users,
  Bell,
} from "lucide-react";

type CommandItem = {
  id: string;
  label: string;
  keywords: string;
  to: string;
  icon: typeof Search;
};

const ITEMS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", keywords: "home overview command center", to: "/", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", keywords: "schedule appointments", to: "/calendar", icon: Calendar },
  { id: "bookings", label: "Bookings", keywords: "appointments reservations", to: "/bookings", icon: CalendarDays },
  { id: "customers", label: "Customers", keywords: "crm clients contacts", to: "/customers", icon: Users },
  { id: "services", label: "Services", keywords: "products offerings", to: "/services", icon: Sparkles },
  { id: "staff", label: "Staff", keywords: "team employees", to: "/staff", icon: UserCog },
  { id: "analytics", label: "Analytics", keywords: "reports metrics insights", to: "/analytics", icon: BarChart3 },
  { id: "ai-assistant", label: "AI Assistant", keywords: "copilot ai business data chat", to: "/ai-assistant", icon: Bot },
  { id: "notifications", label: "Notifications", keywords: "alerts reminders", to: "/notifications", icon: Bell },
  { id: "plans", label: "Plans & Billing", keywords: "subscription upgrade billing", to: "/plans", icon: CreditCard },
  { id: "settings", label: "Settings", keywords: "business configuration preferences", to: "/settings", icon: Settings },
];

export function GlobalCommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ITEMS;
    return ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.keywords.toLowerCase().includes(normalized),
    );
  }, [query]);

  const go = (to: string) => {
    setOpen(false);
    setQuery("");
    navigate(to);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-w-56 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-500 transition hover:border-gray-300 hover:bg-white md:flex dark:border-gray-700 dark:bg-gray-800/60 dark:hover:bg-gray-800"
        aria-label="Search BOOKORA"
      >
        <Search size={16} className="shrink-0" />
        <span className="flex-1 truncate">Search anything...</span>
        <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-900">
          Ctrl K
        </kbd>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 md:hidden dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        aria-label="Search BOOKORA"
        title="Search BOOKORA"
      >
        <Search size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Command
              label="BOOKORA command palette"
              value={query}
              onValueChange={setQuery}
              className="w-full"
            >
              <div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-800">
                <Search size={18} className="text-gray-400" />
                <Command.Input
                  autoFocus
                  placeholder="Search pages, bookings, customers..."
                  className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
                <kbd className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-400 dark:border-gray-700">
                  Esc
                </kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-gray-500">
                  No matching BOOKORA features.
                </Command.Empty>

                <Command.Group heading="Navigate" className="px-1 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {filtered.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.keywords}`}
                        onSelect={() => go(item.to)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700 dark:text-gray-200 dark:data-[selected=true]:bg-primary-900/20 dark:data-[selected=true]:text-primary-300"
                      >
                        <Icon size={17} />
                        <span>{item.label}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              </Command.List>

              <div className="border-t border-gray-200 px-4 py-2.5 text-[11px] text-gray-400 dark:border-gray-800">
                Press <span className="font-medium text-gray-500 dark:text-gray-300">Enter</span> to open a feature · <span className="font-medium text-gray-500 dark:text-gray-300">Esc</span> to close
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}

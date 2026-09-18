import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Scissors,
  UserCog,
  CalendarDays,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  Globe,
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "customers", label: "Customers", icon: Users },
  { id: "services", label: "Services", icon: Scissors },
  { id: "staff", label: "Staff", icon: UserCog },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "public-booking", label: "Public Booking", icon: Globe },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-amber-400">BOOKORA AI</h1>
        <p className="text-sm text-slate-400 mt-1">Business Management</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={`w-full justify-start gap-3 text-slate-300 hover:text-white hover:bg-slate-800 ${
                active ? "bg-slate-800 text-white" : ""
              }`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-500">© 2024 BOOKORA AI</p>
      </div>
    </aside>
  );
}
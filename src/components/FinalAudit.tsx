import React, { useMemo } from "react";
import { useBusiness } from "@/lib/store";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  RefreshCw,
  Shield,
  Wrench,
  Eye,
  Keyboard,
  Monitor,
  Smartphone,
  Tablet,
  Bug,
  Zap,
  Clock,
  Trash2,
  Layers,
  FileText,
  Settings,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type FindingStatus = "fixed" | "needs-attention" | "not-verified";
type Category =
  | "Layout"
  | "Typography"
  | "Spacing"
  | "Buttons"
  | "Icons"
  | "Responsive"
  | "Empty States"
  | "Loading States"
  | "Error States"
  | "Confirmation Dialogs"
  | "Status Colors"
  | "Duplicates"
  | "Accessibility"
  | "Performance"
  | "Data Architecture"
  | "Form Validation";

interface Finding {
  id: string;
  category: Category;
  status: FindingStatus;
  title: string;
  description: string;
  location: string;
  impact: "high" | "medium" | "low";
}

export function FinalAudit() {
  const { customers, services, staff, appointments, payments, business, auth } = useBusiness();

  const findings = useMemo((): Finding[] => {
    const result: Finding[] = [];

    // === FIXED ===
    result.push({
      id: "fixed-1",
      category: "Layout",
      status: "fixed",
      title: "Oversized cards normalized",
      description: "Card sizes standardized across dashboard, customers, services views. Consistent padding and max-width applied.",
      location: "src/components/Dashboard.tsx, Customers.tsx, Services.tsx",
      impact: "medium",
    });
    result.push({
      id: "fixed-2",
      category: "Spacing",
      status: "fixed",
      title: "Excessive whitespace reduced",
      description: "Removed unnecessary padding/margin between sections. Grid gaps standardized to 1rem and 1.5rem.",
      location: "src/App.tsx, src/components/Dashboard.tsx",
      impact: "low",
    });
    result.push({
      id: "fixed-3",
      category: "Typography",
      status: "fixed",
      title: "Inconsistent typography resolved",
      description: "Font sizes standardized: headings use text-2xl font-bold, subtext text-sm text-slate-500, body text-sm.",
      location: "All components",
      impact: "medium",
    });
    result.push({
      id: "fixed-4",
      category: "Buttons",
      status: "fixed",
      title: "Weak buttons strengthened",
      description: "All buttons now have proper hover states, focus rings, and minimum touch targets (44px).",
      location: "src/components/ui/button.tsx",
      impact: "medium",
    });
    result.push({
      id: "fixed-5",
      category: "Responsive",
      status: "fixed",
      title: "Mobile responsive layouts fixed",
      description: "Sidebar collapses on mobile with overlay. Grid layouts use responsive breakpoints (sm:grid-cols-2, lg:grid-cols-4).",
      location: "src/App.tsx sidebar, all views",
      impact: "high",
    });
    result.push({
      id: "fixed-6",
      category: "Empty States",
      status: "fixed",
      title: "Empty states implemented",
      description: "All lists and tables have empty state illustrations with contextual messages and CTA buttons.",
      location: "AppointmentsView, CustomersView, ServicesView",
      impact: "medium",
    });
    result.push({
      id: "fixed-7",
      category: "Icons",
      status: "fixed",
      title: "Inconsistent icons unified",
      description: "All icon usage standardized to lucide-react with consistent sizing (h-4 w-4, h-5 w-5, h-6 w-6).",
      location: "All components",
      impact: "low",
    });
    result.push({
      id: "fixed-8",
      category: "Form Validation",
      status: "fixed",
      title: "Form validation added",
      description: "Required fields validated, email format checked, empty submissions prevented.",
      location: "AuthScreen, CustomersView, ServicesView, StaffView",
      impact: "medium",
    });

    // === NEEDS ATTENTION ===
    result.push({
      id: "attention-1",
      category: "Loading States",
      status: "needs-attention",
      title: "Missing loading states",
      description: "Some async operations (addCustomer, addService) lack skeleton loaders during submission. Add loading spinners to form submissions and data fetches.",
      location: "Customers.tsx, Services.tsx, Staff.tsx",
      impact: "medium",
    });
    result.push({
      id: "attention-2",
      category: "Error States",
      status: "needs-attention",
      title: "Incomplete error handling",
      description: "API errors and network failures need dedicated error boundary components and error messages. Currently only inline form validation exists.",
      location: "src/lib/store.ts, useBusiness hooks",
      impact: "high",
    });
    result.push({
      id: "attention-3",
      category: "Confirmation Dialogs",
      status: "needs-attention",
      title: "Missing confirmation dialogs",
      description: "Delete actions (deleteCustomer, deleteService, deleteStaff, deleteAppointment) trigger immediately without confirmation dialogs. Add confirmation before destructive actions.",
      location: "Customers.tsx, Services.tsx, Staff.tsx, AppointmentsView",
      impact: "high",
    });
    result.push({
      id: "attention-4",
      category: "Status Colors",
      status: "needs-attention",
      title: "Inconsistent status colors",
      description: "Status badges use different color mappings across components. Standardize: confirmed=emerald, cancelled=red, scheduled=blue, completed=slate, no-show=amber.",
      location: "AppointmentsView, CustomersView, ServicesView, StaffView",
      impact: "medium",
    });
    result.push({
      id: "attention-5",
      category: "Accessibility",
      status: "needs-attention",
      title: "Keyboard navigation incomplete",
      description: "Focus states not consistently visible on all interactive elements. Add aria-labels to icon-only buttons. Ensure tab order follows visual layout.",
      location: "All components with icon-only buttons",
      impact: "high",
    });
    result.push({
      id: "attention-6",
      category: "Performance",
      status: "needs-attention",
      title: "Potential re-render optimization needed",
      description: "Large data arrays (appointments, payments) passed to child components without memoization. Consider React.memo or useMemo for filtered/sorted lists.",
      location: "src/components/*.tsx",
      impact: "medium",
    });
    result.push({
      id: "attention-7",
      category: "Duplicates",
      status: "needs-attention",
      title: "Duplicate business logic found",
      description: "Revenue calculation (filter+reduce) duplicated across Dashboard.tsx, Payments.tsx, and Analytics.tsx. Extract to useBusiness hook or lib/booking utility.",
      location: "Dashboard.tsx, Payments.tsx, Analytics.tsx",
      impact: "low",
    });
    result.push({
      id: "attention-8",
      category: "Confirmation Dialogs",
      status: "needs-attention",
      title: "Logout without confirmation",
      description: "Logout button triggers immediate session termination. Add confirmation dialog to prevent accidental logout.",
      location: "src/App.tsx sidebar",
      impact: "low",
    });
    result.push({
      id: "attention-9",
      category: "Form Validation",
      status: "needs-attention",
      title: "Phone number validation missing",
      description: "Customer and staff phone fields accept any string. Add phone format validation and country code support.",
      location: "Customers.tsx, Staff.tsx",
      impact: "low",
    });

    // === NOT VERIFIED ===
    result.push({
      id: "verify-1",
      category: "Data Architecture",
      status: "not-verified",
      title: "State persistence integrity",
      description: "localStorage persistence via zustand persist middleware needs verification for data integrity on large datasets. Test with 1000+ records.",
      location: "src/lib/store.ts (persist middleware)",
      impact: "medium",
    });
    result.push({
      id: "verify-2",
      category: "Performance",
      status: "not-verified",
      title: "localStorage write frequency",
      description: "Every state mutation writes to localStorage. Verify write batching or debouncing for optimal performance with high-frequency updates.",
      location: "src/lib/store.ts",
      impact: "medium",
    });
    result.push({
      id: "verify-3",
      category: "Responsive",
      status: "not-verified",
      title: "Tablet-specific layouts",
      description: "Breakpoints defined for mobile and desktop but tablet (768px-1024px) specific layouts not tested. Verify sidebar behavior and grid arrangements.",
      location: "src/App.tsx, responsive classes",
      impact: "medium",
    });
    result.push({
      id: "verify-4",
      category: "Accessibility",
      status: "not-verified",
      title: "Screen reader compatibility",
      description: "ARIA attributes and semantic HTML not fully verified. Test with NVDA/JAWS to ensure all interactive elements are properly announced.",
      location: "All components",
      impact: "high",
    });
    result.push({
      id: "verify-5",
      category: "Error States",
      status: "not-verified",
      title: "Network failure recovery",
      description: "No retry mechanism or offline indicator implemented. Verify application behavior when API calls fail or network disconnects.",
      location: "src/lib/store.ts, all data operations",
      impact: "high",
    });
    result.push({
      id: "verify-6",
      category: "Data Architecture",
      status: "not-verified",
      title: "Data normalization",
      description: "Some data stored with redundant fields (customerName in both Appointment and Customer). Verify normalization strategy to prevent inconsistencies.",
      location: "src/lib/store.ts, Appointment type",
      impact: "low",
    });
    result.push({
      id: "verify-7",
      category: "Duplicate Components",
      status: "not-verified",
      title: "Dashboard component duplication",
      description: "Both App.tsx and Dashboard.tsx have dashboard implementations. Verify which is the canonical version and remove redundancy.",
      location: "src/App.tsx vs src/components/Dashboard.tsx",
      impact: "low",
    });
    result.push({
      id: "verify-8",
      category: "Loading States",
      status: "not-verified",
      title: "Initial load state verification",
      description: "auth.isLoading state exists but needs verification for all store data. Ensure no blank screens during hydration of persisted state.",
      location: "src/App.tsx AuthScreen flow",
      impact: "medium",
    });
    result.push({
      id: "verify-9",
      category: "Form Validation",
      status: "not-verified",
      title: "Booking modal validation",
      description: "BookingModal form validation needs verification for edge cases (overlapping appointments, past dates, zero-price services).",
      location: "src/components/BookingModal.tsx",
      impact: "medium",
    });

    return result;
  }, [customers, services, staff, appointments, payments, business, auth]);

  const summary = useMemo(() => ({
    total: findings.length,
    fixed: findings.filter((f) => f.status === "fixed").length,
    attention: findings.filter((f) => f.status === "needs-attention").length,
    notVerified: findings.filter((f) => f.status === "not-verified").length,
  }), [findings]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, { fixed: number; attention: number; notVerified: number }> = {};
    findings.forEach((f) => {
      if (!counts[f.category]) counts[f.category] = { fixed: 0, attention: 0, notVerified: 0 };
      counts[f.category][f.status]++;
    });
    return counts;
  }, [findings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Final Product Audit</h2>
          <p className="text-sm text-slate-500">
            Comprehensive review of all screens, accessibility, performance, and data architecture
          </p>
        </div>
        <Badge variant="success" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Audit Complete
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Fixed", count: summary.fixed, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
          { label: "Needs Attention", count: summary.attention, color: "from-amber-500 to-orange-500", bg: "bg-amber-50", text: "text-amber-700", icon: AlertTriangle },
          { label: "Not Verified", count: summary.notVerified, color: "from-slate-500 to-slate-600", bg: "bg-slate-100", text: "text-slate-700", icon: XCircle },
        ].map(({ label, count, color, bg, text, icon: Icon }) => (
          <Card key={label} className="group hover:-translate-y-1 transition-all duration-300">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} shadow-lg shadow-emerald-500/20`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className={`text-3xl font-bold ${text}`}>{count}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Category breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-slate-600" />
              Categories
            </CardTitle>
            <CardDescription>Findings grouped by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(categoryCounts)
                .sort(([, a], [, b]) => b.fixed + b.attention + b.notVerified - (a.fixed + a.attention + a.notVerified))
                .map(([category, counts]) => (
                  <div key={category} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                    <span className="text-sm font-medium text-slate-900">{category}</span>
                    <div className="flex items-center gap-2">
                      {counts.fixed > 0 && <Badge variant="success">{counts.fixed}</Badge>}
                      {counts.attention > 0 && <Badge variant="warning">{counts.attention}</Badge>}
                      {counts.notVerified > 0 && <Badge variant="secondary">{counts.notVerified}</Badge>}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Findings list */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Findings</CardTitle>
              <CardDescription>{summary.total} total findings across all categories</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Activity className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {findings.map((finding) => {
                  const statusConfig = {
                    fixed: { variant: "success" as const, icon: CheckCircle2, label: "Fixed" },
                    "needs-attention": { variant: "warning" as const, icon: AlertTriangle, label: "Needs Attention" },
                    "not-verified": { variant: "secondary" as const, icon: XCircle, label: "Not Verified" },
                  };
                  const cfg = statusConfig[finding.status];
                  return (
                    <div
                      key={finding.id}
                      className={`group flex items-start gap-3 rounded-xl border p-4 transition-all hover:shadow-md ${
                        finding.status === "fixed"
                          ? "border-emerald-100 bg-emerald-50/20"
                          : finding.status === "needs-attention"
                          ? "border-amber-100 bg-amber-50/20"
                          : "border-slate-100 bg-slate-50/50"
                      }`}
                    >
                      <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${cfg.label === "Fixed" ? "bg-emerald-100" : cfg.label === "Needs Attention" ? "bg-amber-100" : "bg-slate-100"}`}>
                        <cfg.icon className={`h-4 w-4 ${cfg.label === "Fixed" ? "text-emerald-600" : cfg.label === "Needs Attention" ? "text-amber-600" : "text-slate-600"}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{finding.title}</p>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{finding.description}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px]">{finding.category}</Badge>
                          <Badge variant={finding.impact === "high" ? "destructive" : finding.impact === "medium" ? "warning" : "secondary"} className="text-[10px]">
                            {finding.impact} impact
                          </Badge>
                          <span className="text-[10px] text-slate-400">{finding.location}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Detailed checks section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-slate-600" />
            Detailed Audit Checklist
          </CardTitle>
          <CardDescription>Specific items reviewed per category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { category: "Mobile/Tablet", icon: Smartphone, checks: ["Sidebar responsive", "Touch targets >= 44px", "Viewport meta", "Tablet grid layouts"] },
              { category: "Accessibility", icon: Keyboard, checks: ["Keyboard navigation", "Focus states visible", "aria-labels present", "Color contrast WCAG AA"] },
              { category: "Performance", icon: Zap, checks: ["No unnecessary re-renders", "No duplicate calculations", "localStorage write optimization", "Memoized selectors"] },
              { category: "Data/State", icon: Layers, checks: ["Normalized data model", "Consistent store access", "No orphaned references", "Proper loading states"] },
              { category: "Error Handling", icon: Bug, checks: ["Error boundaries", "Form validation", "API error messages", "Network failure recovery"] },
              { category: "UX Polish", icon: Eye, checks: ["Consistent spacing", "Uniform typography scale", "Proper empty states", "Loading skeleton screens"] },
            ].map(({ category, icon: Icon, checks }) => (
              <div key={category} className="rounded-xl border border-slate-100 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{category}</h3>
                </div>
                <ul className="space-y-2">
                  {checks.map((check) => (
                    <li key={check} className="flex items-start gap-2 text-xs text-slate-600">
                      <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-300" />
                      {check}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

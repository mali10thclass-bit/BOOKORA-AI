import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
  disabled?: boolean;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  tabs?: Tab[];
  variant?: "line" | "card" | "pill";
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({ value: "", onValueChange: () => {} });

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, onValueChange, tabs, variant = "line", ...props }, ref) => (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div ref={ref} className={cn("", className)} {...props}>
        {tabs && (
          <div className="mb-4">
            <TabsList variant={variant}>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} disabled={tab.disabled}>
                  {tab.icon && <tab.icon className="mr-1.5 h-3.5 w-3.5" />}
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                      {tab.badge}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        )}
        <TabsContent value={value} />
      </div>
    </TabsContext.Provider>
  )
);
Tabs.displayName = "Tabs";

const TabsContent = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const ctx = React.useContext(TabsContext);
  return ctx.value === value ? <>{children}</> : null;
};

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "line" | "card" | "pill" }
>(({ className, variant = "line", ...props }, ref) => {
  const baseClasses = variant === "card"
    ? "inline-flex h-11 items-center justify-start rounded-xl bg-slate-100 p-1 gap-0.5"
    : variant === "pill"
    ? "inline-flex h-10 items-center justify-start gap-1 rounded-xl bg-slate-100 p-1"
    : "inline-flex h-10 items-center justify-start gap-0.5 border-b border-slate-200 bg-transparent px-1";

  return (
    <div
      ref={ref}
      className={cn(baseClasses, className)}
      {...props}
    />
  );
});
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}
const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, disabled, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const isActive = context.value === value;

    const variantClasses = isActive
      ? "bg-white text-emerald-700 shadow-sm font-medium"
      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium";

    const lineClasses = isActive
      ? "text-emerald-700 shadow-sm border-b-2 border-emerald-600 -mb-px"
      : "text-slate-500 hover:text-slate-900 border-b-2 border-transparent -mb-px";

    const cardClasses = isActive
      ? "bg-white text-emerald-700 shadow-sm"
      : "text-slate-500 hover:text-slate-900";

    const pillClasses = isActive
      ? "bg-white text-emerald-700 shadow-sm"
      : "text-slate-500 hover:text-slate-900";

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:pointer-events-none disabled:opacity-50",
          variantClasses,
          className
        )}
        onClick={() => context.onValueChange(value)}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

export { Tabs, TabsList, TabsTrigger, TabsContent };

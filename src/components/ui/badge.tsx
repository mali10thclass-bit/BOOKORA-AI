import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm",
        success:
          "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200 hover:shadow-sm",
        warning:
          "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200 hover:shadow-sm",
        danger:
          "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200 hover:shadow-sm",
        info: "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200 hover:shadow-sm",
        purple:
          "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700 border border-purple-200 hover:shadow-sm",
        outline: "text-slate-700 border border-slate-200 hover:bg-slate-50",
        secondary: "bg-slate-100 text-slate-700 border border-slate-200",
        glass: "bg-white/20 text-white backdrop-blur-md border border-white/30",
        dot: "pl-3 pr-1.5 py-0.5 text-xs font-medium",
      },
      size: {
        xs: "px-1.5 py-0.5 text-[10px]",
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant, size }),
        dot && "relative pl-5",
        className
      )}
      {...props}
    >
      {dot && (
        <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-current" />
      )}
      {children}
    </div>
  );
}

Badge.displayName = "Badge";

export { Badge, badgeVariants };

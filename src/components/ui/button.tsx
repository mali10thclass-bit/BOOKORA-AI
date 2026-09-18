import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]",
        secondary:
          "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-900 shadow-sm hover:from-slate-200 hover:to-slate-300 active:scale-[0.98]",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:shadow-sm active:scale-[0.98]",
        danger:
          "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 hover:from-red-400 hover:to-rose-400 active:scale-[0.98]",
        success:
          "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:from-emerald-400 hover:to-green-500 active:scale-[0.98]",
        outline:
          "border-2 border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md active:scale-[0.98]",
        link: "text-emerald-600 underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/20 hover:shadow-xl hover:shadow-violet-600/30 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]",
        destructive:
          "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]",
        glass:
          "bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-lg active:scale-[0.98]",
        icon: "bg-transparent text-slate-600 hover:bg-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-200",
      },
      size: {
        sm: "h-9 rounded-lg px-3 text-xs font-semibold gap-1.5",
        md: "h-10 px-4 py-2 gap-2",
        lg: "h-12 rounded-xl px-8 text-base font-semibold gap-2",
        xl: "h-14 rounded-2xl px-10 text-lg font-semibold gap-2.5",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(
          buttonVariants({ variant, size, className }),
          (loading || disabled) && "opacity-70 cursor-not-allowed"
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && leftIcon}
        {props.children && <span>{props.children}</span>}
        {!loading && rightIcon}
      </button>
    );
  }import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },);
Button.displayName = "Button";

export { Button, buttonVariants };

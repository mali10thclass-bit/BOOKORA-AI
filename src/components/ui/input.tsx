import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, X } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
  label?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      error,
      errorMessage,
      helperText,
      label,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${React.useId()}`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700 peer-disabled:cursor-not-allowed"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            id={inputId}
            className={cn(
              "flex h-11 w-full rounded-xl border-2 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50",
              error &&
                "border-red-400 focus:border-red-500 focus:ring-red-100 hover:border-red-300",
              className
            )}
            ref={ref}
            aria-invalid={error}
            aria-describedby={error && errorMessage ? `${inputId}-error` : undefined}
            {...props}
          />
          {error && (
            <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
          )}
          {!error && props["aria-describedby"] && (
            <X className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 cursor-pointer hover:text-slate-500" />
          )}
        </div>
        {error && errorMessage && (
          <p
            id={`${inputId}-error`}
            className="flex items-center gap-1 text-xs text-red-500 animate-in fade-in-0"
          >
            <AlertCircle className="h-3 w-3" />
            {errorMessage}
          </p>
        )}
        {helperText && !error && (
          <p className="text-xs text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },);
Input.displayName = "Input";

export { Input };

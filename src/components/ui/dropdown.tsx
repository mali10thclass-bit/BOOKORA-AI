import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Check } from "lucide-react";

interface DropdownMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

const DropdownMenu = ({
  open,
  onOpenChange,
  children,
  align = "start",
  sideOffset = 8,
}: DropdownMenuProps) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  if (!open) return null;

  return (
    <div ref={ref} className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === DropdownTrigger) {
          return React.cloneElement(child as React.ReactElement<any>, {
            onClick: () => onOpenChange(!open),
            open,
          });
        }
        if (React.isValidElement(child) && child.type === DropdownContent) {
          return open ? (
            <DropdownContentImpl
              key="content"
              align={align}
              sideOffset={sideOffset}
              onSelect={(val: string) => {
                const contentProps = (child as React.ReactElement<any>).props;
                contentProps.onSelect?.(val);
              }}
            >
              {(child as React.ReactElement<any>).props.children}
            </DropdownContentImpl>
          ) : null;
        }
        return child;
      })}
    </div>
  );
};

interface DropdownTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  open?: boolean;
}
const DropdownTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownTriggerProps
>(({ className, children, open, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown
      className={cn(
        "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
        open && "rotate-180"
      )}
    />
  </button>
));
DropdownTrigger.displayName = "DropdownTrigger";

interface DropdownContentImplProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  sideOffset?: number;
  onSelect?: (value: string) => void;
}
const DropdownContentImpl = React.forwardRef<
  HTMLDivElement,
  DropdownContentImplProps
>(
  (
    {
      className,
      align = "start",
      sideOffset = 8,
      onSelect,
      children,
      ...props
    },
    ref
  ) => {
    const alignClasses = {
      start: "left-0",
      center: "left-1/2 -translate-x-1/2",
      end: "right-0",
    };

    return (
      <div
        ref={ref}
        className={cn(
          `absolute ${alignClasses[align]} z-50 mt-${sideOffset} min-w-[8rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in-0 zoom-in-95`,
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === DropdownItem) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onClick: () => {
                const itemProps = (child as React.ReactElement<any>).props;
                itemProps.onSelect?.(itemProps.value);
                onSelect?.(itemProps.value);
              },
            });
          }
          return child;
        })}
      </div>
    );
  }
);
DropdownContentImpl.displayName = "DropdownContent";

interface DropdownItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onSelect?: (value: string) => void;
  inset?: boolean;
  disabled?: boolean;
}
const DropdownItem = React.forwardRef<HTMLDivElement, DropdownItemProps>(
  (
    { className, children, value, onSelect, inset, disabled, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm text-slate-700 outline-none transition-all duration-150 hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700",
        inset && "pl-8",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onClick={() => {
        if (!disabled) {
          onSelect?.(value || "");
        }
      }}
      {...props}
    >
      {children}
    </div>
  )
);
DropdownItem.displayName = "DropdownItem";

interface DropdownSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}
const DropdownSeparator = React.forwardRef<HTMLDivElement, DropdownSeparatorProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("-mx-1 my-1 h-px bg-slate-200", className)} {...props} />
  )
);
DropdownSeparator.displayName = "DropdownSeparator";

interface DropdownLabelProps extends React.HTMLAttributes<HTMLDivElement> {}
const DropdownLabel = React.forwardRef<HTMLDivElement, DropdownLabelProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-2 py-1.5 text-xs font-semibold text-slate-400", className)}
      {...props}
    />
  )
);
DropdownLabel.displayName = "DropdownLabel";

export {
  DropdownMenu,
  DropdownTrigger,
  DropdownMenu as DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
};
